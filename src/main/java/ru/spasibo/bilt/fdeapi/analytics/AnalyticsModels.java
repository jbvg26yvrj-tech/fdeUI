package ru.spasibo.bilt.fdeapi.analytics;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import java.time.*;
import java.util.*;
public final class AnalyticsModels {
    private AnalyticsModels() {
    }
    public record Query(LocalDateTime from,
             LocalDateTime to,
             UUID pipelineId,
             String clientFrom,
             String clientTo,
             String datacenter,
             String bucket) {
    }
    public record Config(String sourceTimeZone, boolean testStand) {
    }
    public record Overview(Totals summary,
             List<Point> series,
             Instant generatedAt,
             String sourceTimeZone,
             String bucket,
             LocalDateTime lastStart,
             LocalDateTime lastSuccess,
             List<String> warnings,
             Extra extra) {
    }
    public record CommonError(String message, long count) {
    }
    public record Extra(Long consecutiveFailures, long successfulEmptySessions, List<CommonError> commonErrors) {
    }
    public record PipelineOption(UUID id, String pipelineName, String clientFrom, String clientTo, String primaryDatacenter) {
    }
    public record PipelinePage(List<PipelineOption> content, int page, int size, long totalElements, int totalPages) {
    }
    public record Point(LocalDateTime time, @JsonUnwrapped Totals totals) {
    }
    public record Session(UUID id,
             UUID pipelineId,
             String pipelineName,
             LocalDateTime startDt,
             String status,
             String errorMessage,
             long receivedFiles,
             long receivedBytes,
             long sentFiles,
             long sentBytes,
             long failedFiles,
             long unknownSizeFiles) {
    }
    public record Page(List<Session> content, int page, int size, long totalElements, int totalPages) {
    }
    @JsonAutoDetect(fieldVisibility=JsonAutoDetect.Visibility.ANY)
    public static class Totals {
        private long sessions,success,failed,aborted,active,prepare,unknown,receivedFiles,receivedBytes,sentFiles,sentBytes,failedFiles,skippedFiles,unknownSizeFiles;
        @com.fasterxml.jackson.annotation.JsonProperty public Double errorRate() {
            return success+failed==0 ? null : 100.0*failed/(success+failed);
        }
        public long sessions() {
            return sessions;
        }
        public long success() {
            return success;
        }
        public long failed() {
            return failed;
        }
        public long aborted() {
            return aborted;
        }
        public long active() {
            return active;
        }
        public long prepare() {
            return prepare;
        }
        public long unknown() {
            return unknown;
        }
        public long receivedFiles() {
            return receivedFiles;
        }
        public long receivedBytes() {
            return receivedBytes;
        }
        public long sentFiles() {
            return sentFiles;
        }
        public long sentBytes() {
            return sentBytes;
        }
        public long failedFiles() {
            return failedFiles;
        }
        public long skippedFiles() {
            return skippedFiles;
        }
        public long unknownSizeFiles() {
            return unknownSizeFiles;
        }
        void addStatus(String status,long count) {
            sessions+=count;
            switch(status==null?"":status) {
                case "SUCCESS"->success+=count;
                case "FAILED"->failed+=count;
                case "ABORTED"->aborted+=count;
                case "ACTIVE"->active+=count;
                case "PREPARE"->prepare+=count;
                default->unknown+=count;
            }
        }
        void addFiles(boolean download,String status,long count,long bytes,long unknownSizes) {
            if("SUCCESS".equals(status)) {
                if(download) {
                    receivedFiles+=count;
                    receivedBytes+=bytes;
                }
                else {
                    sentFiles+=count;
                    sentBytes+=bytes;
                }
                unknownSizeFiles+=unknownSizes;
            }
            else if("FAILED".equals(status))failedFiles+=count;
            else if("SKIPPED".equals(status))skippedFiles+=count;
        }
        void add(Totals t) {
            sessions+=t.sessions;
            success+=t.success;
            failed+=t.failed;
            aborted+=t.aborted;
            active+=t.active;
            prepare+=t.prepare;
            unknown+=t.unknown;
            receivedFiles+=t.receivedFiles;
            receivedBytes+=t.receivedBytes;
            sentFiles+=t.sentFiles;
            sentBytes+=t.sentBytes;
            failedFiles+=t.failedFiles;
            skippedFiles+=t.skippedFiles;
            unknownSizeFiles+=t.unknownSizeFiles;
        }
    }
}
