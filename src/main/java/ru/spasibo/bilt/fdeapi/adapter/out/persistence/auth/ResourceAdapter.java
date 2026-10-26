package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceData;
import ru.spasibo.bilt.fdeapi.domain.port.ResourcePort;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Адаптер, реализующий {@link ResourcePort} с помощью JPA-репозиториев.
 * Связывает доменный порт со слоем персистентности для операций над ресурсами.
 */
@Component
@RequiredArgsConstructor
public class ResourceAdapter implements ResourcePort {

    private final ResourceRepository resourceRepository;
    private final RoleResourceRepository roleResourceRepository;

    @Override
    public Optional<ResourceData> findById(UUID id) {
        return resourceRepository.findById(id).map(this::toResourceData);
    }

    @Override
    public Optional<ResourceData> findByCode(String code) {
        return resourceRepository.findByCode(code).map(this::toResourceData);
    }

    @Override
    public boolean existsByCode(String code) {
        return resourceRepository.existsByCode(code);
    }

    @Override
    public boolean existsById(UUID id) {
        return resourceRepository.existsById(id);
    }

    @Override
    public List<ResourceData> findAll() {
        return resourceRepository.findAll().stream()
                .map(this::toResourceData)
                .toList();
    }

    @Override
    public List<ResourceData> findByType(String type) {
        return resourceRepository.findByType(type).stream()
                .map(this::toResourceData)
                .toList();
    }

    @Override
    public ResourceData saveOrUpdate(String code, String name, String description, String type) {
        Optional<ResourceEntity> existing = resourceRepository.findByCode(code);

        ResourceEntity entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setName(name);
            entity.setType(type);
            if (description != null) {
                entity.setDescription(description);
            }
        } else {
            entity = ResourceEntity.builder()
                    .code(code)
                    .name(name)
                    .description(description)
                    .type(type)
                    .build();
        }

        ResourceEntity saved = resourceRepository.save(entity);
        return toResourceData(saved);
    }

    @Override
    public Set<String> findResourceCodesByRoleIds(Collection<UUID> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) {
            return Set.of();
        }
        return resourceRepository.findResourceCodesByRoleIds(roleIds);
    }

    @Override
    public Set<String> findAllCodes() {
        return resourceRepository.findAllCodes();
    }

    @Override
    public Map<UUID, String> findCodesByIds(Collection<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return resourceRepository.findIdAndCodeByIdIn(ids).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (String) row[1]
                ));
    }

    // ---- Маппер ----

    private ResourceData toResourceData(ResourceEntity entity) {
        return new ResourceData(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getDescription(),
                entity.getType(),
                entity.getCreatedAt()
        );
    }
}