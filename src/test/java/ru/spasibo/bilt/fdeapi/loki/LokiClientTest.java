package ru.spasibo.bilt.fdeapi.loki;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.net.URI;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static ru.spasibo.bilt.fdeapi.loki.LokiModels.*;

class LokiClientTest {
    static final UUID SESSION=UUID.fromString("00000000-0000-0000-0000-000000000001");
    static Connection connection() {
        var c=new Connection(); c.id=UUID.randomUUID(); c.name="Test"; c.baseUrl="https://logs.example/proxy";
        c.labels=Map.of("app","fde"); return c;
    }
    static Search search(UUID session,int limit) {
        return new Search(UUID.randomUUID(),session,null,Instant.parse("2026-01-01T00:00:00Z"),Instant.parse("2026-01-01T01:00:00Z"),null,null,limit);
    }
    static byte[] bytes(String value) { return value.getBytes(StandardCharsets.UTF_8); }
    static String response(String values) {
        return "{\"status\":\"success\",\"data\":{\"resultType\":\"streams\",\"result\":[{\"stream\":{\"app\":\"fde\"},\"values\":["+values+"]}]}}";
    }
    static LokiClient client(LokiTransport transport) {
        return new LokiClient(transport,new LokiUrlPolicy("logs.example:443"),new LokiSecretCipher(""));
    }
    @Test void emptySuccessfulResponseIsNotFailureAndProxyPrefixIsPreserved() {
        LokiTransport transport=mock(LokiTransport.class);
        when(transport.get(any(),anyMap(),anyInt())).thenAnswer(inv->{
            URI uri=inv.getArgument(0);
            assertThat(uri.getPath()).isEqualTo("/proxy/loki/api/v1/query_range");
            assertThat(uri.getRawQuery()).contains("query=").doesNotContain(" ");
            return bytes(response(""));
        });
        assertThat(client(transport).query(new LokiRepository.Stored(connection(),null),search(null,100),false).entries()).isEmpty();
    }
    @Test void scopedRowsAreCheckedAgainstJsonNotStreamLabelsAndTruncationIsExplicit() {
        String good="[\"1767225600000000001\",\"{\\\"sessionId\\\":\\\""+SESSION+"\\\",\\\"message\\\":\\\"ok\\\"}\"]";
        String bad="[\"1767225600000000002\",\"{\\\"sessionId\\\":\\\"foreign\\\"}\"]";
        var result=client(mock(LokiTransport.class)).parse(bytes(response(good+","+bad)),connection(),search(SESSION,2),true,2);
        assertThat(result.entries()).hasSize(1); assertThat(result.entries().get(0).line()).contains("ok");
        assertThat(result.truncated()).isTrue();
    }
    @Test void metadataRequiresCategorizedPerRowCorrelationNotParsedOrStreamLabels() {
        var c=connection(); c.correlationMode=CorrelationMode.METADATA;
        String values="[\"1767225600000000001\",\"message\",{\"structuredMetadata\":{\"sessionId\":\""+SESSION+"\"}}],"
                +"[\"1767225600000000002\",\"foreign\",{\"parsed\":{\"sessionId\":\""+SESSION+"\"}}],"
                +"[\"1767225600000000003\",\"push format\",{\"sessionId\":\""+SESSION+"\"}]";
        var result=client(mock(LokiTransport.class)).parse(bytes(response(values)),c,search(SESSION,100),true,100);
        assertThat(result.entries()).extracting(Entry::line).containsExactly("message");
        assertThat(result.message()).contains("categorize-labels");
    }
    @Test void metadataSearchRequestsCategorizedLabelsFromRealQueryApi() {
        var transport=mock(LokiTransport.class); var c=connection(); c.correlationMode=CorrelationMode.METADATA;
        when(transport.get(any(),anyMap(),anyInt())).thenAnswer(inv->{
            Map<String,String> headers=inv.getArgument(1);
            assertThat(headers).containsEntry("X-Loki-Response-Encoding-Flags","categorize-labels");
            return bytes(response(""));
        });
        assertThat(client(transport).query(new LokiRepository.Stored(c,null),search(SESSION,100),true).entries()).isEmpty();
    }
    @Test void malformedAndOverlargeBodiesNeverLeakUpstreamDetails() {
        var client=client(mock(LokiTransport.class));
        for(byte[] body:List.of(bytes("SECRET FROM UPSTREAM"),bytes("{\"status\":\"error\",\"error\":\"SECRET\"}"),new byte[LokiTransport.MAX_BODY+1]))
            assertThatThrownBy(()->client.parse(body,connection(),search(null,100),false,100))
                    .isInstanceOf(LokiTransport.LokiFailure.class).hasMessageNotContaining("SECRET");
    }
    @Test void rangeAndCorrelationFailuresStopOutboundCall() {
        var c=connection(); c.sessionField="";
        assertThatThrownBy(()->client(mock(LokiTransport.class)).query(new LokiRepository.Stored(c,null),search(SESSION,100),true))
                .isInstanceOf(IllegalArgumentException.class);
        var s=new Search(c.id,null,null,Instant.EPOCH,Instant.EPOCH.plusSeconds(86401),null,null,100);
        assertThatThrownBy(()->LokiClient.validateRange(c,s)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void pipelineOnlySearchCannotSilentlyFallBackToGeneralLogs() {
        var c=connection(); c.pipelineField="";
        var s=search(null,100);
        var pipelineSearch=new Search(c.id,null,UUID.randomUUID(),s.from(),s.to(),null,null,100);
        assertThatThrownBy(()->LokiClient.validateRange(c,pipelineSearch)).isInstanceOf(IllegalArgumentException.class);
        var scopedSearch=new Search(c.id,SESSION,pipelineSearch.pipelineId(),s.from(),s.to(),null,null,100);
        assertThatCode(()->LokiClient.validateRange(c,scopedSearch)).doesNotThrowAnyException();
    }
    @Test void literalFiltersUseExtractedAliasesAndCannotInjectStages() {
        String query=LokiQuery.compile(connection(),SESSION,null,"error","\" | json | level=\"info");
        assertThat(query).startsWith("{app=\"fde\"} |= \"\\\" | json | level=\\\"info\"");
        assertThat(query).contains("json fde_query_0=\"sessionId\"", "fde_query_0=\""+SESSION+"\"");
    }
}
