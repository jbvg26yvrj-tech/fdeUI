package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.domain.port.UserSettingPort;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Adapter, реализующий {@link UserSettingPort} с использованием JPA {@link UserSettingRepository}.
 */
@Component
@RequiredArgsConstructor
public class UserSettingAdapter implements UserSettingPort {

    private final UserSettingRepository userSettingRepository;

    @Override
    @Transactional
    public void saveOrUpdate(UUID userId, String key, String value) {
        UserSettingEntity entity = userSettingRepository.findByUserIdAndSettingKey(userId, key)
                .orElse(UserSettingEntity.builder()
                        .userId(userId)
                        .settingKey(key)
                        .build());

        entity.setSettingValue(value);
        userSettingRepository.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<String> get(UUID userId, String key) {
        return userSettingRepository.findByUserIdAndSettingKey(userId, key)
                .map(UserSettingEntity::getSettingValue);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, String> getAll(UUID userId) {
        return userSettingRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(
                        UserSettingEntity::getSettingKey,
                        UserSettingEntity::getSettingValue
                ));
    }

    @Override
    @Transactional
    public void delete(UUID userId, String key) {
        userSettingRepository.deleteByUserIdAndSettingKey(userId, key);
    }
}