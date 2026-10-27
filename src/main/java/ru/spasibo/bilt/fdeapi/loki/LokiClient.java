package ru.spasibo.bilt.fdeapi.loki;

import com.fasterxml.jackson.core.StreamReadConstraints;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.databind.*;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.math.BigInteger;
import java.util.*;
import static ru.spasibo.bilt.fdeapi.loki.LokiModels.*;
import static ru.spasibo.bilt.fdeapi.loki.LokiTransport.LokiFailure;

@Component
public class LokiClient {
    private final LokiTransport transport;
    private final LokiUrlPolicy policy;
    private final LokiSecretCipher cipher;
    private final ObjectMapper json=new ObjectMapper(JsonFactory.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .streamReadConstraints(StreamReadConstraints.builder().maxNestingDepth(100).maxStringLength(300000).build()).build());
    public LokiClient(LokiTransport transport,LokiUrlPolicy policy,LokiSecretCipher cipher) {
        this.transport=transport; this.policy=policy; this.cipher=cipher;
    }
    public LogsResponse query(LokiRepository.Stored stored,Search search,boolean scoped) {
        Connection c=stored.connection;
        validateRange(c,search);
        int limit=search.limit()==null ? c.limit : Math.min(search.limit(),c.limit);
        URI base=policy.validate(c.baseUrl);
        String path=base.getRawPath().replaceAll("/+$","")+"/loki/api/v1/query_range";
        URI target=UriComponentsBuilder.fromUri(base).replacePath(path)
                .queryParam("query","{query}").queryParam("start","{start}").queryParam("end","{end}")
                .queryParam("limit",limit).queryParam("direction","backward").encode()
                .buildAndExpand(Map.of("query",LokiQuery.compile(c,search.sessionId(),search.pipelineId(),search.level(),search.text()),
                        "start",nanos(search.from()).toString(),"end",nanos(search.to()).subtract(BigInteger.ONE).toString())).toUri();
        Map<String,String> headers=new HashMap<>(); headers.put("Accept","application/json");
        if(!c.tenantId.isEmpty()) headers.put("X-Scope-OrgID",c.tenantId);
        if(c.correlationMode==CorrelationMode.METADATA) headers.put("X-Loki-Response-Encoding-Flags","categorize-labels");
        if(c.authType!=AuthType.NONE) {
            if(stored.encryptedSecret==null) throw new IllegalStateException("У подключения Loki не настроен секрет");
            String secret=cipher.decrypt(stored.encryptedSecret);
            headers.put("Authorization",c.authType==AuthType.BEARER ? "Bearer "+secret
                    : "Basic "+Base64.getEncoder().encodeToString((c.username+":"+secret).getBytes(StandardCharsets.UTF_8)));
        }
        return parse(transport.get(target,headers,c.timeoutSeconds),c,search,scoped,limit);
    }
    static void validateRange(Connection c,Search s) {
        if(s.from()==null || s.to()==null || !s.to().isAfter(s.from()) || s.from().isBefore(Instant.EPOCH)
                || Duration.between(s.from(),s.to()).compareTo(Duration.ofHours(c.maxHours))>0)
            throw new IllegalArgumentException("Укажите положительный период не более "+c.maxHours+" ч");
        if(s.limit()!=null && (s.limit()<1 || s.limit()>1000)) throw new IllegalArgumentException("Лимит строк должен быть 1–1000");
        if(s.text()!=null && s.text().length()>1000 || s.level()!=null && s.level().length()>64)
            throw new IllegalArgumentException("Слишком длинный поисковый текст или уровень");
        if(s.pipelineId()!=null && s.sessionId()==null && c.pipelineField.isEmpty())
            throw new IllegalArgumentException("У источника нет корреляции с пайплайнами; выберите сессию");
        if(s.sessionId()!=null && c.sessionField.isEmpty()) throw new IllegalArgumentException("У источника нет корреляции с сессиями");
    }
    static BigInteger nanos(Instant instant) {
        return BigInteger.valueOf(instant.getEpochSecond()).multiply(BigInteger.valueOf(1000000000L)).add(BigInteger.valueOf(instant.getNano()));
    }
    LogsResponse parse(byte[] body,Connection c,Search s,boolean scoped,int limit) {
        try {
            if(body==null || body.length>LokiTransport.MAX_BODY) throw new IllegalArgumentException();
            JsonNode root=json.readTree(body), data=root.path("data");
            if(!root.path("status").asText().equals("success") || !data.path("resultType").asText().equals("streams") || !data.path("result").isArray())
                throw new IllegalArgumentException();
            List<Entry> entries=new ArrayList<>(); int seen=0, filtered=0;
            for(JsonNode stream:data.path("result")) {
                if(!stream.path("stream").isObject() || !stream.path("values").isArray()) throw new IllegalArgumentException();
                Map<String,String> labels=new LinkedHashMap<>();
                var fields=stream.path("stream").fields();
                while(fields.hasNext()) {
                    var field=fields.next();
                    if(labels.size()>=100 || !field.getValue().isTextual() || field.getValue().textValue().length()>2048) throw new IllegalArgumentException();
                    if(!field.getKey().startsWith("fde_query_")) labels.put(field.getKey(),field.getValue().textValue());
                }
                for(JsonNode value:stream.path("values")) {
                    if(++seen>1000 || !value.isArray() || value.size()<2 || !value.get(0).isTextual() || !value.get(1).isTextual()) throw new IllegalArgumentException();
                    String line=value.get(1).textValue();
                    if(line.length()>262144) throw new IllegalArgumentException();
                    BigInteger[] ts=new BigInteger(value.get(0).textValue()).divideAndRemainder(BigInteger.valueOf(1000000000L));
                    Instant time=Instant.ofEpochSecond(ts[0].longValueExact(),ts[1].longValueExact());
                    if(time.isBefore(s.from()) || !time.isBefore(s.to())) { filtered++; continue; }
                    // Correlation is verified against the row, never an upstream stream-label collision.
                    if(s.sessionId()!=null || scoped) {
                        JsonNode metadata;
                        if(c.correlationMode==CorrelationMode.JSON) {
                            try { metadata=json.readTree(line); } catch(Exception invalidLine) { filtered++; continue; }
                        } else metadata=value.size()>2 ? value.get(2).path("structuredMetadata") : null;
                        if(metadata==null || s.sessionId()==null || !metadata.path(c.sessionField).isTextual()
                                || !s.sessionId().toString().equals(metadata.path(c.sessionField).textValue())) { filtered++; continue; }
                    }
                    if(entries.size()<limit) entries.add(new Entry(time.toString(),line,Collections.unmodifiableMap(labels)));
                }
            }
            entries.sort(Comparator.comparing((Entry e)->Instant.parse(e.timestamp())).reversed());
            boolean truncated=seen>=limit;
            String message=truncated ? "Достигнут лимит строк; сузьте период. Полнота при одинаковых timestamps не гарантируется." : null;
            if(filtered>0 && c.correlationMode==CorrelationMode.METADATA)
                message=(message==null ? "" : message+" ")+"Для проверки сессии Loki должен поддерживать categorize-labels и возвращать structuredMetadata каждой строки.";
            if(filtered>0) message=(message==null ? "" : message+" ")+"Исключены строки вне периода или без точной корреляции с сессией.";
            return new LogsResponse(List.copyOf(entries),truncated,message);
        } catch(Exception e) { throw new LokiFailure("Loki: некорректный или слишком большой ответ источника"); }
    }
}
