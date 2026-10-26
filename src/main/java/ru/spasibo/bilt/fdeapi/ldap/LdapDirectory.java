package ru.spasibo.bilt.fdeapi.ldap;

import com.unboundid.ldap.sdk.*;
import com.unboundid.ldap.sdk.extensions.StartTLSExtendedRequest;
import com.unboundid.util.ssl.HostNameSSLSocketVerifier;
import org.springframework.stereotype.Component;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import java.net.URI;
import java.math.BigInteger;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.*;

@Component
public class LdapDirectory {
    private final SSLSocketFactory ssl;
    public LdapDirectory() {
        try { ssl = SSLContext.getDefault().getSocketFactory(); }
        catch (Exception ex) { throw new IllegalStateException("TLS unavailable"); }
    }
    LdapDirectory(SSLSocketFactory ssl) { this.ssl = ssl; }

    public DirectoryIdentity authenticate(LdapSettings settings, String bindPassword, String login, String password) {
        if (login == null || login.isBlank() || password == null || password.isEmpty()) throw new DirectoryException();
        try (LDAPConnection connection = connect(settings, bindPassword)) {
            Filter filter = Filter.createANDFilter(userFilter(settings, login), Filter.createEqualityFilter(settings.getLoginAttribute(), login));
            SearchResultEntry entry = search(connection, settings, filter).orElseThrow(DirectoryException::new);
            DirectoryIdentity identity = identity(settings, entry);
            // Bind on a second verified TLS connection: service search privileges remain separate.
            try (LDAPConnection userConnection = connectTls(settings)) { userConnection.bind(entry.getDN(), password); }
            return identity;
        } catch (Exception ex) { throw new DirectoryException(); }
    }

    public Optional<DirectoryIdentity> findById(LdapSettings settings, String password, String externalId) {
        return findAllByIds(settings, password, List.of(externalId)).get(externalId);
    }

    public Map<String, Optional<DirectoryIdentity>> findAllByIds(LdapSettings settings, String password, List<String> ids) {
        try (LDAPConnection connection = connect(settings, password)) {
            SearchResult root = connection.search(settings.getBaseDn(), SearchScope.BASE, "(objectClass=*)", "1.1");
            if (root.getEntryCount() != 1 || root.getReferenceCount() != 0) throw new DirectoryException();
            Map<String, Optional<DirectoryIdentity>> results = new LinkedHashMap<>();
            for (String id : ids) results.put(id, Optional.empty());
            // Keep group/object eligibility restrictions while allowing the login itself to be renamed.
            Filter eligibility = Filter.create(settings.getUserFilter().replace("{login}", "*"));
            for (int start = 0; start < ids.size(); start += 100) {
                if (Thread.currentThread().isInterrupted()) throw new DirectoryException();
                List<String> batch = ids.subList(start, Math.min(start + 100, ids.size()));
                List<Filter> idFilters = new ArrayList<>();
                for (String id : batch) idFilters.add("AD".equals(settings.getDirectoryType())
                        ? Filter.createEqualityFilter(settings.getIdAttribute(), Base64.getDecoder().decode(id))
                        : Filter.createEqualityFilter(settings.getIdAttribute(), id));
                SearchRequest request = new SearchRequest(settings.getBaseDn(), SearchScope.SUB,
                        Filter.createANDFilter(eligibility, Filter.createORFilter(idFilters)), "*", "+");
                request.setSizeLimit(batch.size() + 1);
                request.setTimeLimitSeconds(Math.max(1, settings.getReadTimeoutMs() / 1000));
                SearchResult result = connection.search(request);
                if (result.getResultCode() != ResultCode.SUCCESS || result.getReferenceCount() != 0) throw new DirectoryException();
                Set<String> seen = new HashSet<>();
                for (SearchResultEntry entry : result.getSearchEntries()) {
                    DirectoryIdentity identity = identity(settings, entry);
                    if (!batch.contains(identity.externalId()) || !seen.add(identity.externalId())) throw new DirectoryException();
                    results.put(identity.externalId(), Optional.of(identity));
                }
            }
            return results;
        } catch (Exception ex) { throw new DirectoryException(); }
    }

    public void test(LdapSettings settings, String password) {
        try (LDAPConnection connection = connect(settings, password)) {
            // BASE read proves access to the configured search root without importing users.
            SearchResult result = connection.search(settings.getBaseDn(), SearchScope.BASE, "(objectClass=*)", "1.1");
            if (result.getEntryCount() != 1 || result.getReferenceCount() != 0) throw new DirectoryException();
        } catch (Exception ex) { throw new DirectoryException(); }
    }

    private LDAPConnection connect(LdapSettings settings, String password) throws Exception {
        if (password == null || password.isEmpty()) throw new DirectoryException();
        LDAPConnection connection = connectTls(settings);
        try { connection.bind(settings.getBindDn(), password); return connection; }
        catch (Exception ex) { connection.close(); throw ex; }
    }
    private LDAPConnection connectTls(LdapSettings settings) throws Exception {
        settings.validate();
        URI uri = URI.create(settings.getUrl());
        LDAPConnectionOptions options = new LDAPConnectionOptions();
        options.setConnectTimeoutMillis(settings.getConnectTimeoutMs());
        options.setResponseTimeoutMillis(settings.getReadTimeoutMs());
        options.setFollowReferrals(false);
        options.setSSLSocketVerifier(new HostNameSSLSocketVerifier(true));
        boolean ldaps = "LDAPS".equals(settings.getTlsMode());
        LDAPConnection connection = new LDAPConnection(ldaps ? ssl : null, options);
        try {
            connection.connect(uri.getHost(), uri.getPort() > 0 ? uri.getPort() : ldaps ? 636 : 389);
            if (!ldaps && connection.processExtendedOperation(new StartTLSExtendedRequest(ssl)).getResultCode() != ResultCode.SUCCESS)
                throw new DirectoryException();
            return connection;
        } catch (Exception ex) { connection.close(); throw ex; }
    }
    private Filter userFilter(LdapSettings settings, String login) throws LDAPException {
        return Filter.create(settings.getUserFilter().replace("{login}", Filter.encodeValue(login)));
    }
    private Optional<SearchResultEntry> search(LDAPConnection connection, LdapSettings settings, Filter filter) throws LDAPException {
        SearchRequest request = new SearchRequest(settings.getBaseDn(), SearchScope.SUB, filter, "*", "+");
        request.setSizeLimit(2);
        request.setTimeLimitSeconds(Math.max(1, settings.getReadTimeoutMs() / 1000));
        SearchResult result = connection.search(request);
        if (result.getResultCode() != ResultCode.SUCCESS || result.getReferenceCount() != 0 || result.getEntryCount() > 1)
            throw new DirectoryException();
        return result.getSearchEntries().stream().findFirst();
    }
    private DirectoryIdentity identity(LdapSettings settings, SearchResultEntry entry) {
        try {
            byte[] id = entry.getAttributeValueBytes(settings.getIdAttribute());
            String login = entry.getAttributeValue(settings.getLoginAttribute());
            if (id == null || id.length == 0 || login == null || login.isBlank() || login.length() > 100) throw new DirectoryException();
            boolean active = Filter.create(settings.getActiveFilter()).matchesEntry(entry);
            String stable = entry.getAttributeValue(settings.getIdAttribute());
            if ("AD".equals(settings.getDirectoryType())) {
                if (id.length != 16) throw new DirectoryException();
                stable = Base64.getEncoder().encodeToString(id);
                String flags = entry.getAttributeValue("userAccountControl");
                if (flags == null) throw new DirectoryException();
                active &= (Long.parseLong(flags) & 2) == 0;
                String expiration = entry.getAttributeValue("accountExpires");
                if (expiration != null) {
                    BigInteger expiry = new BigInteger(expiration);
                    if (expiry.signum() != 0 && !expiry.equals(BigInteger.valueOf(Long.MAX_VALUE))) {
                        BigInteger now = BigInteger.valueOf(Instant.now().getEpochSecond()).add(BigInteger.valueOf(11644473600L))
                                .multiply(BigInteger.valueOf(10000000L));
                        active &= expiry.compareTo(now) > 0;
                    }
                }
            }
            return new DirectoryIdentity(stable, login, entry.getAttributeValue(settings.getDisplayNameAttribute()),
                    entry.getAttributeValue(settings.getEmailAttribute()), active);
        } catch (Exception ex) { throw new DirectoryException(); }
    }
}
