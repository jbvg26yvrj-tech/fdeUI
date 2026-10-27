package ru.spasibo.bilt.fdeapi.information;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import java.util.Map;
import static ru.spasibo.bilt.fdeapi.information.InformationModels.*;
@RestController
@RequestMapping("/api/v1/information")
@PreAuthorize("isAuthenticated()")
public class InformationController {
    private final InformationService service;
    private final PermissionService permissions;
    public InformationController(InformationService service,PermissionService permissions) { this.service=service;this.permissions=permissions; }
    @GetMapping public Document read() { return service.read(permissions.currentUserHasRole("ADMIN")); }
    @PutMapping @PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
    public Document save(@RequestBody Document draft) { return service.save(draft); }
    @ExceptionHandler(InformationConflictException.class)
    public ResponseEntity<Map<String,String>> conflict(InformationConflictException e) { return ResponseEntity.status(409).body(Map.of("message",e.getMessage())); }
}
