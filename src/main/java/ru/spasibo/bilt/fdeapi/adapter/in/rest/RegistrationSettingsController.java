package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.spasibo.bilt.fdeapi.application.service.RegistrationSettingsService;

@RestController
@RequestMapping("/api/v1/settings/access")
@PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
@RequiredArgsConstructor
public class RegistrationSettingsController {
    private final RegistrationSettingsService settings;
    public record Settings(@NotNull Boolean registrationEnabled) {}
    @GetMapping public Settings get() { return new Settings(settings.enabled()); }
    @PutMapping public Settings update(@Valid @RequestBody Settings value) {
        settings.update(value.registrationEnabled());
        return new Settings(value.registrationEnabled());
    }
}
