package ru.spasibo.bilt.fdeapi.information;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static ru.spasibo.bilt.fdeapi.information.InformationModels.*;
import java.util.List;
@Repository
public class InformationRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public InformationRepository(JdbcTemplate jdbc,ObjectMapper json) { this.jdbc=jdbc;this.json=json; }
    public Document read() {
        return jdbc.queryForObject("select version,blocks::text from public.system_information where id=1",(rs,n)->{
            try { return new Document(rs.getLong(1),json.readValue(rs.getString(2),new TypeReference<List<Block>>() {})); }
            catch(Exception e) { throw new IllegalStateException("Не удалось прочитать информацию о системе",e); }
        });
    }
    public boolean save(Document draft) {
        final String blocks;
        try { blocks=json.writeValueAsString(draft.blocks()); }
        catch(Exception e) { throw new IllegalStateException("Не удалось сохранить информацию о системе",e); }
        return jdbc.update("update public.system_information set blocks=cast(? as jsonb),version=version+1,updated_at=current_timestamp where id=1 and version=?",blocks,draft.version())==1;
    }
}
