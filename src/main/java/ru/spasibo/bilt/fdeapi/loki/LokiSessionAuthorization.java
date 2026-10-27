package ru.spasibo.bilt.fdeapi.loki;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.application.service.AccessScopeService;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.SessionRepository;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import java.util.UUID;

/** Resolves lazy database fields inside a short transaction, completed before any remote I/O. */
@Service
public class LokiSessionAuthorization {
    private final AccessScopeService scope;
    private final SessionRepository sessions;
    public LokiSessionAuthorization(AccessScopeService scope,SessionRepository sessions) { this.scope=scope; this.sessions=sessions; }
    @Transactional(readOnly=true)
    public void require(UUID sessionId,UUID pipelineId,String datacenter) {
        var session=sessions.findOne(scope.sessions().and((root,query,cb)->cb.equal(root.get("id"),sessionId)))
                .orElseThrow(()->new AccessDeniedException("Session access denied"));
        if(pipelineId!=null && !pipelineId.equals(session.getPipelineId())) throw new AccessDeniedException("Session access denied");
        if(!datacenter.isEmpty() && !datacenter.equalsIgnoreCase(session.getPipeline().getPrimaryDatacenter()))
            throw new AccessDeniedException("Подключение Loki не соответствует датацентру сессии");
    }
}
