package ru.spasibo.bilt.fdeapi.analytics;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.time.LocalDateTime;
import java.util.UUID;
import static ru.spasibo.bilt.fdeapi.analytics.AnalyticsModels.*;
@RestController
@RequestMapping("/api/v1/analytics")
@PreAuthorize("@permissionService.currentUserHasRole('ADMIN') or @permissionService.currentUserHasPermission('api.analytics.read')")
public class AnalyticsController {
    private final AnalyticsService service;
    public AnalyticsController(AnalyticsService service) {
        this.service=service;
    }
    @GetMapping("/config")
    public Config config() {
        return service.config();
    }
    @GetMapping("/pipelines")
    public PipelinePage pipelines(@RequestParam(defaultValue="") String query,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="100") int size) {
        return service.pipelines(query,page,size);
    }
    @GetMapping("/overview")
    public Overview overview(@RequestParam LocalDateTime from,
            @RequestParam LocalDateTime to,
            @RequestParam(required=false) UUID pipelineId,
            @RequestParam(required=false) String clientFrom,
            @RequestParam(required=false) String clientTo,
            @RequestParam(required=false) String datacenter,
            @RequestParam(defaultValue="hour") String bucket) {
        return service.overview(new Query(from,to,pipelineId,clientFrom,clientTo,datacenter,bucket));
    }
    @GetMapping("/pipelines/{id}")
    public Overview pipeline(@PathVariable UUID id,
            @RequestParam LocalDateTime from,
            @RequestParam LocalDateTime to,
            @RequestParam(required=false) String clientFrom,
            @RequestParam(required=false) String clientTo,
            @RequestParam(required=false) String datacenter,
            @RequestParam(defaultValue="hour") String bucket) {
        return service.overview(new Query(from,to,id,clientFrom,clientTo,datacenter,bucket));
    }
    @GetMapping("/sessions")
    public Page sessions(@RequestParam LocalDateTime from,
            @RequestParam LocalDateTime to,
            @RequestParam(required=false) UUID pipelineId,
            @RequestParam(required=false) String clientFrom,
            @RequestParam(required=false) String clientTo,
            @RequestParam(required=false) String datacenter,
            @RequestParam(defaultValue="hour") String bucket,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size,
            @RequestParam(required=false) String status,
            @RequestParam(required=false) String errorMessage) {
        return service.sessions(new Query(from,to,pipelineId,clientFrom,clientTo,datacenter,bucket),page,size,status,errorMessage);
    }
}
