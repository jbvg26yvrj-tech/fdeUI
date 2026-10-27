package ru.spasibo.bilt.fdeapi.loki;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.Instant;
import java.util.*;
import static ru.spasibo.bilt.fdeapi.loki.LokiModels.*;

@RestController
@PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
@RequestMapping("/api/v1/logs")
public class LokiController {
    private final LokiService service;
    public LokiController(LokiService service) { this.service=service; }
    @GetMapping("/connections") public List<SafeConnection> connections() { return service.connections(); }
    @GetMapping public LogsResponse search(@RequestParam UUID connectionId,@RequestParam(required=false) UUID sessionId,
            @RequestParam(required=false) UUID pipelineId,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required=false) String level,@RequestParam(required=false) String text,@RequestParam(required=false) Integer limit) {
        return service.search(new Search(connectionId,sessionId,pipelineId,from,to,level,text,limit));
    }
}
