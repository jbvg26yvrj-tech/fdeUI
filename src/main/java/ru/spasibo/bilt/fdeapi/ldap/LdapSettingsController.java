package ru.spasibo.bilt.fdeapi.ldap;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.scheduling.annotation.EnableScheduling;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;

@RestController
@PreAuthorize("@permissionService.currentUserHasRole('ADMIN')") @RequestMapping("/api/v1/settings/ldap") @RequiredArgsConstructor @EnableScheduling
public class LdapSettingsController {
    private final LdapSettingsService settings;
    private final LdapSyncService sync;
    private final PermissionService permissions;

    private void requireAdmin() {
        if (!permissions.currentUserHasRole("ADMIN")) throw new AccessDeniedException("Admin access required");
    }
    @GetMapping public LdapSettings get() { requireAdmin(); return settings.get(); }
    @PutMapping public LdapSettings save(@RequestBody LdapSettings request) { requireAdmin(); return settings.save(request); }
    @PostMapping("/test") public LdapSettingsService.TestResult test(@RequestBody LdapSettings request) {
        requireAdmin(); return settings.test(request);
    }
    @PostMapping("/sync") public LdapSyncService.SyncResult sync() { requireAdmin(); return sync.runNow(); }
    @GetMapping("/sync") public LdapSyncService.SyncResult status() { requireAdmin(); return sync.status(); }
}
