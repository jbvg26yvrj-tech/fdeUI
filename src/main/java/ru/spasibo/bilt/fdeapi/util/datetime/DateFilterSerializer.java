package ru.spasibo.bilt.fdeapi.util.datetime;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import ru.spasibo.bilt.fdeapi.util.rls.DateConstants;


import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

public class DateFilterSerializer extends JsonSerializer<DateFilter> {

    @Override
    public void serialize(DateFilter df, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (df == null) {
            gen.writeNull();
            return;
        }

        long count = Stream.of(
                df.getEq(), df.getNe(), df.getGt(), df.getLt(), df.getGte(), df.getLte()
        ).filter(Objects::nonNull).count();

        if (count == 1) {
            if (df.getEq() != null) writeSingle(gen, df.getEq(), "eq");
            else if (df.getNe() != null) writeSingle(gen, df.getNe(), "ne");
            else if (df.getGt() != null) writeSingle(gen, df.getGt(), "gt");
            else if (df.getLt() != null) writeSingle(gen, df.getLt(), "lt");
            else if (df.getGte() != null) writeSingle(gen, df.getGte(), "gte");
            else if (df.getLte() != null) writeSingle(gen, df.getLte(), "lte");
        }
        else if (count == 2 && df.getGte() != null && df.getLte() != null) {
            String fromStr = formatDateTime(df.getGte());
            String toStr   = formatDateTime(df.getLte());
            String value   = fromStr + "," + toStr;
            String precision = df.getGte().getPrecision().name();

            Map<String, Object> map = new HashMap<>();
            map.put("value", value);
            map.put("operator", "between");
            map.put("precision", precision);
            gen.writeObject(map);
        } else {
            gen.writeNull();
        }
    }

    private void writeSingle(JsonGenerator gen, DateTimeFilterValue filterValue, String operator) throws IOException {
        Map<String, Object> map = new HashMap<>();
        map.put("value", formatDateTime(filterValue));
        map.put("operator", operator);
        map.put("precision", filterValue.getPrecision().name());
        gen.writeObject(map);
    }

    private String formatDateTime(DateTimeFilterValue value) {
        if (value == null) return null;
        switch (value.getPrecision()) {
            case DATE:
                return value.getValue().toLocalDate().toString();
            case SECOND:
                return value.getValue().format(DateConstants.ISO_LOCAL_DATE_TIME);
                    default:
                return value.getValue().toString();
        }
    }
}