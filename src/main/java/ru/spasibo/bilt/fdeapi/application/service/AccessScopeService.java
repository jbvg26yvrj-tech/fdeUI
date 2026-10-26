package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.PipelineSessionEntity;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import ru.spasibo.bilt.fdeapi.domain.port.CurrentUserPort;
import ru.spasibo.bilt.fdeapi.domain.port.RolePort;
import ru.spasibo.bilt.fdeapi.util.rls.RlsFilterService;
import ru.spasibo.bilt.fdeapi.util.rls.RlsSpecificationBuilder;
import java.util.*;
import java.util.stream.Collectors;

/** One fail-closed scope policy, combined with any existing RLS restrictions. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccessScopeService {
    private final CurrentUserPort currentUserPort;
    private final RolePort rolePort;
    private final PipelineRepository pipelineRepository;
    private final RlsFilterService rlsFilterService;
    private final RlsSpecificationBuilder rlsBuilder;

    private UUID userId() {
        return currentUserPort.getCurrentUserId().orElseThrow(() -> new AccessDeniedException("Authentication required"));
    }

    public boolean isAdmin() { return rolePort.findRoleCodesByUserId(userId()).contains("ADMIN"); }

    public Set<String> clientCodes() {
        return rolePort.findRoleIdsByUserId(userId()).stream()
                .map(id -> rolePort.findById(id).orElseThrow(() -> new AccessDeniedException("Role unavailable")))
                .flatMap(role -> role.clientCodes().stream()).map(AccessScopeService::normalize)
                .filter(code -> !code.isEmpty()).collect(Collectors.toSet());
    }

    static String normalize(String code) { return code == null ? "" : code.trim().toUpperCase(Locale.ROOT); }

    public static boolean matches(Set<String> codes, String from, String to) {
        return codes.stream().map(AccessScopeService::normalize).filter(code -> !code.isEmpty())
                .anyMatch(code -> code.equals(normalize(from)) || code.equals(normalize(to)));
    }

    public void requireParticipants(String from, String to) {
        if (!isAdmin() && !matches(clientCodes(), from, to)) throw new AccessDeniedException("Pipeline access denied");
    }

    public Specification<PipelineEntity> pipelines() {
        if (isAdmin()) return Specification.allOf();
        Set<String> codes = clientCodes();
        Specification<PipelineEntity> scope = (root, query, cb) -> codes.isEmpty() ? cb.disjunction()
                : cb.or(cb.upper(cb.trim(root.get("clientFrom"))).in(codes), cb.upper(cb.trim(root.get("clientTo"))).in(codes));
        return scope.and(rls("table.pipelines", PipelineEntity.class));
    }

    public Specification<PipelineSessionEntity> sessions() {
        if (isAdmin()) return Specification.allOf();
        Specification<PipelineEntity> visiblePipelines = pipelines();
        // Join by UUID in the database so the scope applies to pagination and counts without loading IDs.
        Specification<PipelineSessionEntity> scope = (root, query, cb) -> {
            var pipeline = query.from(PipelineEntity.class);
            return cb.and(cb.equal(root.get("pipelineId"), pipeline.get("id")),
                    visiblePipelines.toPredicate(pipeline, query, cb));
        };
        return scope.and(rls("table.sessions", PipelineSessionEntity.class));
    }

    private <T> Specification<T> rls(String resource, Class<T> type) {
        String login = currentUserPort.getCurrentUser().orElseThrow(() -> new AccessDeniedException("Authentication required")).login();
        return rlsFilterService.getResolvedFilterForResource(resource, login)
                .map(filter -> rlsBuilder.buildSpecificationFromFilter(filter, type)).orElseGet(Specification::allOf);
    }

    public void requirePipeline(UUID id) {
        if (!pipelineRepository.exists(pipelines().and((root, query, cb) -> cb.equal(root.get("id"), id))))
            throw new AccessDeniedException("Pipeline access denied");
    }

    /** Persist/flush inside caller transaction, then validate RLS against proposed values; denial rolls back. */
    public void requireSavedPipeline(UUID id) { requirePipeline(id); }
}
