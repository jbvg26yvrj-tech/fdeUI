package ru.spasibo.bilt.fdeapi.loki;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.*;

public final class LokiModels {
    private LokiModels() {}
    public enum AuthType { NONE, BASIC, BEARER }
    public enum CorrelationMode { JSON, METADATA }
    /** Deliberately no generated toString: request objects may contain credentials. */
    public static class Connection {
        public UUID id;
        public String name="", description="", baseUrl="", username="", tenantId="", datacenter="";
        public boolean enabled=true;
        public AuthType authType=AuthType.NONE;
        public Map<String,String> labels=new LinkedHashMap<>();
        public String sessionField="sessionId", pipelineField="pipelineId", levelField="level";
        public CorrelationMode correlationMode=CorrelationMode.JSON;
        public int timeoutSeconds=10, limit=200, maxHours=24;
        public boolean secretConfigured;
        @JsonProperty(access=JsonProperty.Access.WRITE_ONLY) public String secret;
        @JsonProperty(access=JsonProperty.Access.WRITE_ONLY) public boolean clearSecret;
    }
    public record SafeConnection(UUID id, String name, String datacenter, String sessionField, int maxHours, int limit) {}
    public record Entry(String timestamp, String line, Map<String,String> labels) {}
    public record LogsResponse(List<Entry> entries, boolean truncated, String message) {}
    public record TestResult(boolean success, String message, Instant checkedAt) {}
    public record Search(UUID connectionId, UUID sessionId, UUID pipelineId, Instant from, Instant to, String level, String text, Integer limit) {}
}
