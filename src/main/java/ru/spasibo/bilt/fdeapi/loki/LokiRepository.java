package ru.spasibo.bilt.fdeapi.loki;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;
import static ru.spasibo.bilt.fdeapi.loki.LokiModels.*;

@Repository
public class LokiRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public LokiRepository(JdbcTemplate jdbc,ObjectMapper json) { this.jdbc=jdbc; this.json=json; }
    // No toString on stored secrets either.
    public static final class Stored {
        final Connection connection; final String encryptedSecret;
        Stored(Connection connection,String encryptedSecret) { this.connection=connection; this.encryptedSecret=encryptedSecret; }
    }
    public List<Stored> list() {
        return jdbc.query("select id, config::text, encrypted_secret from public.loki_connections order by created_at, id",(rs,n)->{
            try {
                Connection c=json.readValue(rs.getString(2),Connection.class); c.id=rs.getObject(1,UUID.class);
                String secret=rs.getString(3); c.secretConfigured=secret!=null;
                return new Stored(c,secret);
            } catch(Exception e) { throw new IllegalStateException("Не удалось прочитать настройки Loki"); }
        });
    }
    public Optional<Stored> find(UUID id) { return list().stream().filter(s->s.connection.id.equals(id)).findFirst(); }
    public void save(Connection connection,String encryptedSecret) {
        final String config;
        try { config=json.writeValueAsString(connection); }
        catch(Exception e) { throw new IllegalStateException("Не удалось сохранить настройки Loki"); }
        jdbc.update("insert into public.loki_connections(id,config,encrypted_secret) values (?,cast(? as jsonb),?) "
                +"on conflict(id) do update set config=excluded.config, encrypted_secret=excluded.encrypted_secret, updated_at=current_timestamp",
                connection.id,config,encryptedSecret);
    }
}
