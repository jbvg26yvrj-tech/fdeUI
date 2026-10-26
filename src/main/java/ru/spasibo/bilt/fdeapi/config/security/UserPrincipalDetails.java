package ru.spasibo.bilt.fdeapi.config.security;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;

import java.util.Collection;
import java.util.Collections;

/**
 * Адаптер Spring Security, оборачивающий доменный объект {@link UserPrincipal}
 * и реализующий {@link UserDetails}. Сохраняет доменную модель свободной
 * от зависимостей фреймворка.
 */
@Getter
@RequiredArgsConstructor
public class UserPrincipalDetails implements UserDetails {

    private final UserPrincipal principal;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.emptyList();
    }

    @Override
    public String getPassword() {
        return null;
    }

    @Override
    public String getUsername() {
        return principal.login();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return principal.activated();
    }
}