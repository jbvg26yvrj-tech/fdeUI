package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.domain.model.RlsFilter;
import ru.spasibo.bilt.fdeapi.domain.model.UserRls;
import ru.spasibo.bilt.fdeapi.domain.port.ResourcePort;
import ru.spasibo.bilt.fdeapi.domain.port.RlsPort;
import ru.spasibo.bilt.fdeapi.domain.port.RolePort;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Адаптер, реализующий {@link RlsPort} с использованием JPA-репозиториев.
 * Связывает доменный порт со слоем персистентности для операций RLS.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RlsAdapter implements RlsPort {

    private final RoleRlsRepository roleRlsRepository;
    private final RolePort rolePort;
    private final ResourcePort resourcePort;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public UserRls getUserRls(UUID userId) {
        Set<UUID> roleIds = rolePort.findRoleIdsByUserId(userId);
        if (roleIds.isEmpty()) {
            return new UserRls(Collections.emptyMap());
        }

        List<RoleRlsEntity> rlsEntities = roleRlsRepository.findByRoleIdIn(roleIds);
        if (rlsEntities.isEmpty()) {
            return new UserRls(Collections.emptyMap());
        }

        // Пакетная загрузка всех кодов ресурсов одним запросом вместо N+1
        Set<UUID> resourceIds = rlsEntities.stream()
                .map(RoleRlsEntity::getResourceId)
                .collect(Collectors.toSet());
        Map<UUID, String> resourceCodeMap = resourcePort.findCodesByIds(resourceIds);

        Map<String, JsonNode> filters = new HashMap<>();
        for (RoleRlsEntity entity : rlsEntities) {
            String resourceCode = resourceCodeMap.get(entity.getResourceId());
            if (resourceCode != null) {

                JsonNode existing = null;
                try {
                    JsonNode next = objectMapper.readTree(entity.getFilter());
                    if (next == null || next.isNull()) throw new IllegalStateException("Missing RLS filter");
                    existing = filters.putIfAbsent(resourceCode, next);
                    if (existing != null) {
                        var combined = objectMapper.createObjectNode();
                        combined.putArray("allOf").add(existing).add(next);
                        filters.put(resourceCode, combined);
                    }
                } catch (JsonProcessingException e) {
                    throw new RuntimeException(e);
                }
            } else {
                throw new IllegalStateException("RLS resource unavailable");
            }
        }

        return new UserRls(Collections.unmodifiableMap(filters));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<String> getRlsFilter(UUID roleId, UUID resourceId) {
        return roleRlsRepository.findByRoleIdAndResourceId(roleId, resourceId)
                .map(RoleRlsEntity::getFilter);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RlsFilter> getRlsForRole(UUID roleId) {
        List<RoleRlsEntity> entities = roleRlsRepository.findByRoleId(roleId);
        if (entities.isEmpty()) {
            return List.of();
        }

        // Пакетная загрузка всех кодов ресурсов одним запросом вместо N+1
        Set<UUID> resourceIds = entities.stream()
                .map(RoleRlsEntity::getResourceId)
                .collect(Collectors.toSet());
        Map<UUID, String> resourceCodeMap = resourcePort.findCodesByIds(resourceIds);

        return entities.stream()
                .map(entity -> new RlsFilter(
                        entity.getRoleId(),
                        entity.getResourceId(),
                        resourceCodeMap.get(entity.getResourceId()),
                        entity.getFilter(),
                        entity.getCreatedAt(),
                        entity.getUpdatedAt()))
                .toList();
    }

    @Override
    @Transactional
    public void saveRlsFilter(UUID roleId, UUID resourceId, String filter) {
        Optional<RoleRlsEntity> existing = roleRlsRepository.findByRoleIdAndResourceId(roleId, resourceId);

        if (existing.isPresent()) {
            RoleRlsEntity entity = existing.get();
            entity.setFilter(filter);
            roleRlsRepository.save(entity);
        } else {
            RoleRlsEntity entity = RoleRlsEntity.builder()
                    .roleId(roleId)
                    .resourceId(resourceId)
                    .filter(filter)
                    .build();
            roleRlsRepository.save(entity);
        }
    }

    @Override
    @Transactional
    public void deleteRlsFilter(UUID id) {
        roleRlsRepository.deleteById(id);
    }

}
