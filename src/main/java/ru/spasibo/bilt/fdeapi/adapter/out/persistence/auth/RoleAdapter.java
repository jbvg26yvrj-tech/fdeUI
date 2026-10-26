package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.spasibo.bilt.fdeapi.domain.model.RoleData;
import ru.spasibo.bilt.fdeapi.domain.port.RolePort;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Адаптер, реализующий {@link RolePort} с использованием JPA-репозиториев.
 * Связывает доменный порт со слоем персистентности для операций с ролями,
 * связями ролей и ресурсов, а также связями ролей и пользователей.
 */
@Component
@RequiredArgsConstructor
public class RoleAdapter implements RolePort {

    private final RoleRepository roleRepository;
    private final RoleResourceRepository roleResourceRepository;
    private final RoleUserRepository roleUserRepository;

    @Override
    public Optional<RoleData> findById(UUID id) {
        return roleRepository.findById(id).map(this::toRoleData);
    }

    @Override
    public Optional<RoleData> findByCode(String code) {
        return roleRepository.findByCode(code).map(this::toRoleData);
    }

    @Override
    public boolean existsByCode(String code) {
        return roleRepository.existsByCode(code);
    }


    @Override
    public boolean existsById(UUID id) {
        return roleRepository.existsById(id);
    }

    @Override
    public List<RoleData> findAll() {
        return roleRepository.findAll().stream()
                .map(this::toRoleData)
                .toList();
    }

    @Override
    public RoleData save(String code, String name, String description, boolean isSystem) {
        RoleEntity entity = RoleEntity.builder()
                .code(code)
                .name(name)
                .description(description)
                .system(isSystem)
                .build();
        RoleEntity saved = roleRepository.save(entity);
        return toRoleData(saved);
    }

    @Override
    public RoleData update(UUID id, String name, String description) {
        RoleEntity entity = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("Role not found: " + id));

        if (name != null) {
            entity.setName(name);
        }
        if (description != null) {
            entity.setDescription(description);
        }

        RoleEntity saved = roleRepository.save(entity);
        return toRoleData(saved);
    }

    @Override
    public void delete(UUID id) {
        roleRepository.deleteById(id);
    }

    @Override
    public boolean isSystemRole(UUID id) {
        return roleRepository.findById(id)
                .map(RoleEntity::isSystem)
                .orElse(false);
    }

    // ---- Связи Role-Resource ----

    @Override
    public void assignResource(UUID roleId, UUID resourceId) {
        RoleResourceEntity entity = RoleResourceEntity.builder()
                .roleId(roleId)
                .resourceId(resourceId)
                .build();
        roleResourceRepository.save(entity);
    }

    @Override
    public void removeResource(UUID roleId, UUID resourceId) {
        roleResourceRepository.deleteByRoleIdAndResourceId(roleId, resourceId);
    }

    @Override
    public boolean isResourceAssignedToRole(UUID roleId, UUID resourceId) {
        return roleResourceRepository.existsByRoleIdAndResourceId(roleId, resourceId);
    }

    // ---- Связи Role-User ----

    @Override
    public void assignUser(UUID roleId, UUID userId) {
        RoleUserEntity entity = RoleUserEntity.builder()
                .roleId(roleId)
                .userId(userId)
                .build();
        roleUserRepository.save(entity);
    }

    @Override
    public void removeUser(UUID roleId, UUID userId) {
        roleUserRepository.deleteByRoleIdAndUserId(roleId, userId);
    }

    @Override
    public boolean isUserAssignedToRole(UUID roleId, UUID userId) {
        return roleUserRepository.existsByRoleIdAndUserId(roleId, userId);
    }

    @Override
    public List<UUID> findUserIdsByRoleId(UUID roleId) {
        return roleUserRepository.findByRoleId(roleId).stream()
                .map(RoleUserEntity::getUserId)
                .toList();
    }

    @Override
    public Set<UUID> findRoleIdsByUserId(UUID userId) {
        return roleRepository.findRoleIdsByUserId(userId);
    }

    @Override
    public Set<String> findRoleCodesByUserId(UUID userId) {
        return roleRepository.findRoleCodesByUserId(userId);
    }

    @Override
    public RoleData updateClientCodes(UUID id, Set<String> codes) {
        RoleEntity entity = roleRepository.findById(id).orElseThrow(() -> new IllegalStateException("Role not found"));
        entity.setClientCodes(codes.stream().map(code -> code.trim().toUpperCase(java.util.Locale.ROOT))
                .filter(code -> !code.isEmpty()).collect(java.util.stream.Collectors.toSet()));
        return toRoleData(roleRepository.save(entity));
    }

    // ---- Маппинг ----

    private RoleData toRoleData(RoleEntity entity) {
        return new RoleData(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getDescription(),
                entity.isSystem(),
                entity.getCreatedAt(), entity.getClientCodes()
        );
    }
}