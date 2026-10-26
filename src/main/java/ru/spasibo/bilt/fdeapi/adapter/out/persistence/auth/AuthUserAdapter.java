package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import ru.spasibo.bilt.fdeapi.domain.exception.UserNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.port.AuthUserPort;
import ru.spasibo.bilt.fdeapi.domain.port.UserManagementPort;

import java.util.*;

/**
 * Адаптер, реализующий {@link AuthUserPort} и {@link UserManagementPort}
 * с помощью JPA {@link UserRepository}.
 * Связывает доменные порты со слоем персистентности.
 */
@Component
@RequiredArgsConstructor
public class AuthUserAdapter implements AuthUserPort, UserManagementPort {

    private final UserRepository userRepository;
    private final RoleUserRepository roleUserRepository;
    // ---- Реализация AuthUserPort ----

    @Override
    public Optional<AuthUserData> findByLogin(String login) {
        return userRepository.findByLogin(login).map(this::toAuthUserData);
    }

    @Override
    public Optional<AuthUserData> findById(UUID id) {
        return userRepository.findById(id).map(this::toAuthUserData);
    }

    @Override
    public List<AuthUserData> findByIds(Collection<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return userRepository.findAllById(ids).stream()
                .map(this::toAuthUserData)
                .toList();
    }

    @Override
    public boolean existsByLogin(String login) {
        return userRepository.existsByLogin(login);
    }

    @Override
    public AuthUserData save(String login, String passwordHash) {
        UserEntity entity = UserEntity.builder()
                .login(login)
                .password(passwordHash)
                .activated(false)
                .passwordChangeRequired(true)
                .build();

        UserEntity saved = userRepository.save(entity);
        return toAuthUserData(saved);
    }

    @Override
    public void updatePassword(UUID userId, String passwordHash, boolean passwordChangeRequired) {
        UserEntity entity = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        entity.setPassword(passwordHash);
        entity.setPasswordChangeRequired(passwordChangeRequired);
        userRepository.save(entity);
    }

    // ---- Реализация UserManagementPort ----

    @Override
    public Page<AuthUserData> findAll(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toAuthUserData);
    }

    @Override
    public AuthUserData update(UUID userId, Boolean activated, Boolean passwordChangeRequired) {
        UserEntity entity = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        if (activated != null) {
            entity.setManualDisabled(!activated);
            entity.setActivated(activated && !entity.isDirectoryDisabled());
        }
        if (passwordChangeRequired != null && "LOCAL".equals(entity.getAuthSource())) {
            entity.setPasswordChangeRequired(passwordChangeRequired);
        }

        UserEntity saved = userRepository.save(entity);
        return toAuthUserData(saved);
    }

    @Override
    public void delete(UUID userId) {
        userRepository.deleteById(userId);
    }

    @Override
    public long count() {
        return userRepository.count();
    }

    @Override
    public AuthUserData save(String login, String passwordHash, boolean activated) {
        UserEntity entity = UserEntity.builder()
                .login(login)
                .password(passwordHash)
                .activated(activated)
                .passwordChangeRequired(true)
                .build();

        UserEntity saved = userRepository.save(entity);
        return toAuthUserData(saved);
    }

    private AuthUserData toAuthUserData(UserEntity entity) {
        return new AuthUserData(
                entity.getId(),
                entity.getLogin(),
                entity.getPassword(),
                entity.isActivated(),
                entity.isPasswordChangeRequired(),
                entity.getAuthSource()
        );
    }

    @Override
    public Set<String> findUserCodesByRoleIds(Collection<UUID> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) {
            return Set.of();
        }
        return roleUserRepository.findUserCodesByRoleIds(roleIds);
    }

}
