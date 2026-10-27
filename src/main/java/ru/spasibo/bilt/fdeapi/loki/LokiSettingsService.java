package ru.spasibo.bilt.fdeapi.loki;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.LoggerFactory;
import java.time.Instant;
import java.util.*;
import static ru.spasibo.bilt.fdeapi.loki.LokiModels.*;

@Service
public class LokiSettingsService {
    private final LokiRepository repository;
    private final LokiSecretCipher cipher;
    private final LokiClient client;
    public LokiSettingsService(LokiRepository repository,LokiSecretCipher cipher,LokiClient client) {
        this.repository=repository; this.cipher=cipher; this.client=client;
    }
    public List<Connection> list() { return repository.list().stream().map(s->s.connection).toList(); }
    static void validate(Connection c) {
        if(c==null) throw new IllegalArgumentException("Укажите настройки Loki");
        c.name=bounded(c.name,120,"название").trim();
        if(c.name.isEmpty()) throw new IllegalArgumentException("Укажите название подключения Loki");
        c.description=bounded(c.description,2000,"описание");
        c.username=bounded(c.username,256,"логин"); c.tenantId=bounded(c.tenantId,256,"tenant");
        c.datacenter=bounded(c.datacenter,40,"датацентр").trim();
        c.baseUrl=bounded(c.baseUrl,2048,"URL").trim(); LokiUrlPolicy.syntax(c.baseUrl);
        if(c.authType==null || c.correlationMode==null) throw new IllegalArgumentException("Укажите способ авторизации и корреляции");
        if(c.username.contains(":") || c.username.chars().anyMatch(ch->ch<32) || c.tenantId.chars().anyMatch(ch->ch<32 || ch>126))
            throw new IllegalArgumentException("Недопустимое значение логина или tenant");
        if(c.authType==AuthType.BASIC && c.username.isBlank()) throw new IllegalArgumentException("Укажите логин Basic");
        if(c.timeoutSeconds<1 || c.timeoutSeconds>30 || c.limit<1 || c.limit>1000 || c.maxHours<1 || c.maxHours>24)
            throw new IllegalArgumentException("Пределы Loki: таймаут 1–30 секунд, строки 1–1000, период 1–24 часа");
        c.sessionField=field(c.sessionField); c.pipelineField=field(c.pipelineField); c.levelField=field(c.levelField);
        if(c.labels==null || c.labels.isEmpty() || c.labels.size()>20) throw new IllegalArgumentException("Укажите 1–20 базовых меток Loki");
        boolean nonempty=false;
        for(var label:c.labels.entrySet()) {
            if(field(label.getKey()).isEmpty()) throw new IllegalArgumentException("Пустая метка Loki");
            if(label.getValue()==null) throw new IllegalArgumentException("Значение метки Loki не может быть null");
            String value=bounded(label.getValue(),512,"метка"); nonempty|=!value.isEmpty();
        }
        if(!nonempty) throw new IllegalArgumentException("Хотя бы одна метка Loki должна иметь непустое значение");
        if(c.secret!=null && (c.secret.length()>8192 || (c.authType==AuthType.BEARER && c.secret.chars().anyMatch(ch->ch<33 || ch>126))))
            throw new IllegalArgumentException("Некорректный секрет Loki");
        if(c.clearSecret && c.secret!=null && !c.secret.isEmpty()) throw new IllegalArgumentException("Выберите замену или очистку секрета");
    }
    static String field(String value) {
        value=value==null ? "" : value;
        if(!value.isEmpty() && (!value.matches("[A-Za-z_][A-Za-z0-9_]{0,63}") || value.startsWith("__") || value.startsWith("fde_query_")))
            throw new IllegalArgumentException("Недопустимое имя поля или метки Loki");
        return value;
    }
    private static String bounded(String value,int max,String field) {
        if(value==null) return "";
        if(value.length()>max) throw new IllegalArgumentException("Слишком длинное поле Loki: "+field);
        return value;
    }
    @Transactional public Connection save(UUID id,Connection draft) {
        validate(draft);
        var previous=id==null ? null : required(id);
        draft.id=id==null ? UUID.randomUUID() : id;
        String encrypted=secret(draft,previous);
        repository.save(draft,encrypted);
        draft.secretConfigured=encrypted!=null; draft.secret=null; draft.clearSecret=false;
        var authentication=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        LoggerFactory.getLogger(LokiSettingsService.class).info("Loki connection configuration updated: id={}, enabled={}, actor={}",
                draft.id,draft.enabled,authentication==null ? "unavailable" : authentication.getName());
        return draft;
    }
    LokiRepository.Stored required(UUID id) {
        return repository.find(id).orElseThrow(()->new IllegalArgumentException("Подключение Loki не найдено"));
    }
    private String secret(Connection draft,LokiRepository.Stored previous) {
        if(draft.clearSecret) return null;
        if(draft.secret!=null && !draft.secret.isEmpty()) return cipher.encrypt(draft.secret);
        if(previous!=null) return previous.encryptedSecret;
        return null;
    }
    public TestResult test(Connection draft) {
        try {
            validate(draft);
            var previous=draft.id==null ? null : required(draft.id);
            var stored=new LokiRepository.Stored(draft,secret(draft,previous));
            Instant now=Instant.now();
            client.query(stored,new Search(draft.id,null,null,now.minusSeconds(60),now,null,null,1),false);
            return new TestResult(true,"Read API Loki доступен (пустой результат также считается успешным)",Instant.now());
        } catch(IllegalArgumentException | IllegalStateException | LokiTransport.LokiFailure e) {
            return new TestResult(false,e.getMessage(),Instant.now());
        }
    }
}
