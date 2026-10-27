package ru.spasibo.bilt.fdeapi.loki;

import java.util.*;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import static ru.spasibo.bilt.fdeapi.loki.LokiModels.*;

final class LokiQuery {
    private static final ObjectMapper JSON=new ObjectMapper();
    static String literal(String value) {
        try { return JSON.writeValueAsString(value); }
        catch(JsonProcessingException e) { throw new IllegalArgumentException("Некорректный поисковый текст"); }
    }
    static String compile(Connection c, UUID sessionId, UUID pipelineId, String level, String text) {
        String query=c.labels.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .map(e->e.getKey()+"="+literal(e.getValue())).collect(Collectors.joining(",","{","}"));
        if(text!=null && !text.isEmpty()) query+=" |= "+literal(text);
        Map<String,String> filters=new LinkedHashMap<>();
        if(sessionId!=null) filters.put(c.sessionField,sessionId.toString());
        if(pipelineId!=null && !c.pipelineField.isEmpty()) filters.put(c.pipelineField,pipelineId.toString());
        if(level!=null && !level.isEmpty()) {
            if(c.levelField.isEmpty()) throw new IllegalArgumentException("У источника не настроено поле уровня");
            filters.put(c.levelField,level);
        }
        if(!filters.isEmpty() && c.correlationMode==CorrelationMode.JSON) {
            // Explicit aliases avoid a stream label shadowing the extracted correlation field.
            int i=0;
            for(var filter:filters.entrySet()) {
                String alias="fde_query_"+(i++);
                query+=" | json "+alias+"="+literal(filter.getKey())+" | __error__=\"\" | "+alias+"="+literal(filter.getValue());
            }
        } else for(var filter:filters.entrySet()) query+=" | "+filter.getKey()+"="+literal(filter.getValue());
        return query;
    }
}
