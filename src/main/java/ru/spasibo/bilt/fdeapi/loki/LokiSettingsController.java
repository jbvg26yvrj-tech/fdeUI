package ru.spasibo.bilt.fdeapi.loki;

import org.springframework.web.bind.annotation.*;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import java.util.*;
import static ru.spasibo.bilt.fdeapi.loki.LokiModels.*;

@RestController
@RequestMapping("/api/v1/settings/loki")
public class LokiSettingsController {
    private final LokiSettingsService settings;
    private final PermissionService permissions;
    public LokiSettingsController(LokiSettingsService settings,PermissionService permissions) { this.settings=settings; this.permissions=permissions; }
    private void requireAdmin() {
        if(!permissions.currentUserHasRole("ADMIN")) throw new AccessDeniedException("Admin access required");
    }
    @GetMapping public List<Connection> list() { requireAdmin(); return settings.list(); }
    @PostMapping public Connection create(@RequestBody Connection draft) { requireAdmin(); return settings.save(null,draft); }
    @PutMapping("/{id}") public Connection save(@PathVariable UUID id,@RequestBody Connection draft) { requireAdmin(); return settings.save(id,draft); }
    @PostMapping("/test") public TestResult test(@RequestBody Connection draft) { requireAdmin(); return settings.test(draft); }
}
