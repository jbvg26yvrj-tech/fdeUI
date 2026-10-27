package ru.spasibo.bilt.fdeapi.loki;

import org.springframework.stereotype.Service;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import java.util.*;
import static ru.spasibo.bilt.fdeapi.loki.LokiModels.*;

@Service
public class LokiService {
    private final LokiSettingsService settings;
    private final LokiClient client;
    private final LokiSessionAuthorization authorization;
    private final PermissionService permissions;
    public LokiService(LokiSettingsService settings,LokiClient client,LokiSessionAuthorization authorization,PermissionService permissions) {
        this.settings=settings; this.client=client; this.authorization=authorization; this.permissions=permissions;
    }
    private boolean requireRead() {
        boolean admin=permissions.currentUserHasRole("ADMIN");
        if(!admin && !permissions.currentUserHasPermission("api.logs.read")) throw new AccessDeniedException("Log access denied");
        return admin;
    }
    public List<SafeConnection> connections() {
        requireRead();
        return settings.list().stream().filter(c->c.enabled)
                .map(c->new SafeConnection(c.id,c.name,c.datacenter,c.sessionField,c.maxHours,c.limit)).toList();
    }
    public LogsResponse search(Search search) {
        boolean admin=requireRead();
        if(!admin && search.sessionId()==null) throw new AccessDeniedException("Для просмотра логов выберите доступную сессию");
        var stored=settings.required(search.connectionId()); var c=stored.connection;
        if(!c.enabled) throw new IllegalArgumentException("Подключение Loki отключено");
        if(search.sessionId()!=null) authorization.require(search.sessionId(),search.pipelineId(),c.datacenter);
        return client.query(stored,search,!admin);
    }
}
