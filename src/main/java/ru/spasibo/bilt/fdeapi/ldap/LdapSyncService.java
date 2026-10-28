package ru.spasibo.bilt.fdeapi.ldap;

import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

@Service
public class LdapSyncService {
    @org.springframework.beans.factory.annotation.Autowired(required=false)
    private ru.spasibo.bilt.fdeapi.audit.AuditService audit;
    private final LdapSettingsService settings;
    private final LdapSettingsRepository repository;
    private final UserRepository users;
    private final LdapDirectory directory;
    private final LdapIdentityService identities;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final ExecutorService collector = new ThreadPoolExecutor(0, 1, 30, TimeUnit.SECONDS,
            new SynchronousQueue<>(), runnable -> { Thread t = new Thread(runnable, "ldap-sync-collector"); t.setDaemon(true); return t; });

    public LdapSyncService(LdapSettingsService settings, LdapSettingsRepository repository, UserRepository users,
                           LdapDirectory directory, LdapIdentityService identities, JdbcTemplate jdbc,
                           PlatformTransactionManager manager) {
        this.settings = settings; this.repository = repository; this.users = users;
        this.directory = directory; this.identities = identities; this.jdbc = jdbc;
        this.transaction = new TransactionTemplate(manager);
        this.transaction.setTimeout(5);
    }
    @PreDestroy void close() { collector.shutdownNow(); }

    public SyncResult status() {
        LdapSettingsEntity row = settings.entity();
        if ("RUNNING".equals(row.getSyncStatus()) && row.getLeaseUntil() != null && row.getLeaseUntil().isBefore(Instant.now()))
            return new SyncResult("FAILED", "Предыдущая синхронизация прервана; изменения не применены", 0, 0, 0, row.getLeaseUntil());
        return result(row);
    }
    public SyncResult runNow() { return run(false); }
    @Scheduled(fixedDelay = 60000, initialDelay = 60000)
    public void scheduled() {
        try { if (settings.get().isSyncEnabled()) {
            SyncResult outcome = run(true);
            if (audit != null && !"RUNNING".equals(outcome.status())) audit.record("ldap.sync.scheduled", "ldap", null, "SUCCESS".equals(outcome.status()) ? "SUCCESS" : "FAILURE");
        } }
        catch (RuntimeException ignored) { /* Database/infra outages are retried; never log directory secrets. */ }
    }
    private SyncResult run(boolean scheduled) {
        LdapSettingsEntity snapshot = settings.entity();
        LdapSettings configuration = settings.decode(snapshot);
        if (!(configuration.isEnabled() || configuration.isSyncEnabled()))
            return new SyncResult("DISABLED", "LDAP отключён", 0, 0, 0, Instant.now());
        String owner = UUID.randomUUID().toString();
        int acquired = jdbc.update("UPDATE auth.ldap_settings SET lease_owner=?, lease_until=CURRENT_TIMESTAMP + INTERVAL '60' SECOND, "
                + "sync_status='RUNNING', sync_message='Синхронизация выполняется', sync_checked=0, sync_updated=0, sync_deactivated=0, sync_finished_at=NULL "
                + "WHERE id=1 AND (lease_until IS NULL OR lease_until<CURRENT_TIMESTAMP)"
                + (scheduled ? " AND (next_sync_at IS NULL OR next_sync_at<=CURRENT_TIMESTAMP)" : ""), owner);
        if (acquired == 0) return status();
        Future<Map<UUID, Optional<DirectoryIdentity>>> pending = null;
        try {
            var page = users.findByAuthSource("LDAP", PageRequest.of(0, 10000));
            if (page.hasNext()) throw new DirectoryException();
            // Each protocol operation is bounded, and the collection has a separate overall deadline.
            configuration.setConnectTimeoutMs(Math.min(configuration.getConnectTimeoutMs(), 2000));
            configuration.setReadTimeoutMs(Math.min(configuration.getReadTimeoutMs(), 2000));
            String password = settings.password(snapshot);
            pending = collector.submit(() -> {
                Map<String, Optional<DirectoryIdentity>> found = directory.findAllByIds(configuration, password,
                        page.stream().map(UserEntity::getExternalId).toList());
                Map<UUID, Optional<DirectoryIdentity>> staged = new LinkedHashMap<>();
                for (UserEntity user : page) {
                    if (Thread.currentThread().isInterrupted()) throw new DirectoryException();
                    if (!found.containsKey(user.getExternalId())) throw new DirectoryException();
                    staged.put(user.getId(), found.get(user.getExternalId()));
                }
                return staged;
            });
            Map<UUID, Optional<DirectoryIdentity>> staged = pending.get(20, TimeUnit.SECONDS);
            return transaction.execute(tx -> {
                if (audit != null) audit.context();
                LdapSettingsEntity row = repository.lock().orElseThrow();
                if (!owner.equals(row.getLeaseOwner()) || row.getLeaseUntil() == null || row.getLeaseUntil().isBefore(Instant.now())
                        || !Objects.equals(snapshot.getConfigJson(), row.getConfigJson())
                        || !Objects.equals(snapshot.getEncryptedPassword(), row.getEncryptedPassword())) throw new DirectoryException();
                int updated = 0, deactivated = 0;
                for (var entry : staged.entrySet()) {
                    UserEntity user = users.findById(entry.getKey()).orElse(null);
                    if (user == null || !"LDAP".equals(user.getAuthSource())) continue;
                    boolean active = user.isActivated();
                    if (identities.applyDirectoryState(user, entry.getValue())) updated++;
                    if (active && !user.isActivated()) deactivated++;
                    users.save(user);
                }
                row.setSyncStatus("SUCCESS"); row.setSyncMessage("Синхронизация завершена");
                row.setSyncChecked(staged.size()); row.setSyncUpdated(updated); row.setSyncDeactivated(deactivated);
                finish(row, configuration.getSyncIntervalMinutes());
                repository.saveAndFlush(row);
                return result(row);
            });
        } catch (Exception ex) {
            if (pending != null) pending.cancel(true);
            if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
            return transaction.execute(tx -> {
                if (audit != null) audit.context();
                LdapSettingsEntity row = repository.lock().orElseThrow();
                if (owner.equals(row.getLeaseOwner())) {
                    row.setSyncStatus("FAILED");
                    row.setSyncMessage("LDAP не проверен полностью; изменения не применены. Проверьте связь, права и настройки");
                    row.setSyncChecked(0); row.setSyncUpdated(0); row.setSyncDeactivated(0);
                    finish(row, configuration.getSyncIntervalMinutes());
                    repository.saveAndFlush(row);
                }
                return result(row);
            });
        }
    }
    private void finish(LdapSettingsEntity row, int interval) {
        Instant now = Instant.now(); row.setSyncFinishedAt(now); row.setNextSyncAt(now.plusSeconds(interval * 60L));
        row.setLeaseOwner(null); row.setLeaseUntil(null);
    }
    private SyncResult result(LdapSettingsEntity row) {
        return new SyncResult(row.getSyncStatus(), row.getSyncMessage(), row.getSyncChecked(), row.getSyncUpdated(),
                row.getSyncDeactivated(), row.getSyncFinishedAt());
    }
    public record SyncResult(String status, String message, int checked, int updated, int deactivated, Instant finishedAt) {}
}
