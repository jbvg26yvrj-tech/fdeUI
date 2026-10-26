package ru.spasibo.bilt.fdeapi.config.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;
import ru.spasibo.bilt.fdeapi.domain.port.CurrentUserPort;

import java.util.Optional;
import java.util.UUID;

/**
 * Адаптер, реализующий {@link CurrentUserPort} на основе {@link SecurityContextHolder}
 * из Spring Security. Изолирует зависимость от фреймворка от сервисов слоя приложения.
 */
@Component
public class CurrentUserAdapter implements CurrentUserPort {

    @Override
    public Optional<UUID> getCurrentUserId() {
        return getCurrentUser().map(UserPrincipal::id);
    }

    @Override
    public Optional<UserPrincipal> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipalDetails details)) {
            return Optional.empty();
        }
        return Optional.of(details.getPrincipal());
    }
}