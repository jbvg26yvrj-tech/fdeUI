package ru.spasibo.bilt.fdeapi.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import ru.spasibo.bilt.fdeapi.util.rls.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class RlsScopeFailureTest {
    @Test void missingPrincipalCannotTurnRlsIntoUnrestrictedAccess() {
        SecurityContextHolder.clearContext();
        var service = new RlsFilterService(mock(RlsService.class), new ObjectMapper());
        assertThrows(AccessDeniedException.class, () -> service.getResolvedFilterForResource("table.pipelines", "user"));
    }

    @Test void invalidFieldInMandatoryConditionIsNotDropped() throws Exception {
        var mapper = new ObjectMapper();
        var builder = new RlsSpecificationBuilder(mock(RlsFilterService.class));
        var filter = mapper.readTree("{\"conditions\":[{\"field\":\"missing\",\"operator\":\"eq\",\"value\":\"DWH\"}]}");
        Root<PipelineEntity> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        when(root.get("missing")).thenThrow(new IllegalArgumentException("unknown field"));
        assertThrows(AccessDeniedException.class, () -> builder.buildSpecificationFromFilter(filter, PipelineEntity.class).toPredicate(root, query, cb));
        verify(cb, never()).conjunction();
    }

    @Test void invalidStructureProducesFalsePredicate() throws Exception {
        var builder = new RlsSpecificationBuilder(mock(RlsFilterService.class));
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Predicate denied = mock(Predicate.class);
        when(cb.disjunction()).thenReturn(denied);
        assertSame(denied, builder.buildSpecificationFromFilter(new ObjectMapper().readTree("{\"conditions\":42}"), PipelineEntity.class)
                .toPredicate(mock(Root.class), mock(CriteriaQuery.class), cb));
    }
}
