package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;

@Service
@RequiredArgsConstructor
public class RegistrationSettingsService {
    private final JdbcTemplate jdbc;
    public boolean enabled() {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT registration_enabled FROM auth.registration_settings WHERE id=1", Boolean.class));
    }
    // The registration transaction holds this shared lock until the user is saved.
    // Disabling registration waits for in-flight registrations; later requests fail.
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void requireEnabled() {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT registration_enabled FROM auth.registration_settings WHERE id=1 FOR SHARE", Boolean.class)))
            throw new AccessDeniedException("Регистрация отключена администратором");
    }
    @Transactional
    public void update(boolean enabled) {
        if (jdbc.update("UPDATE auth.registration_settings SET registration_enabled=? WHERE id=1",enabled)!=1)
            throw new IllegalStateException("Registration settings missing");
    }
}
