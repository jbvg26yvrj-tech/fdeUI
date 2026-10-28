package ru.spasibo.bilt.fdeapi.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.http.SessionCreationPolicy;

/** The management connector must only be reachable from trusted cluster monitoring. */
@Configuration
public class ManagementSecurityConfig {
    @Bean
    @Order(0)
    SecurityFilterChain managementSecurity(HttpSecurity http,
            @Value("${management.server.port:9090}") int managementPort) throws Exception {
        return http.securityMatcher(request -> request.getLocalPort() == managementPort)
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**", "/actuator/prometheus").permitAll()
                        .anyRequest().denyAll())
                .build();
    }
}
