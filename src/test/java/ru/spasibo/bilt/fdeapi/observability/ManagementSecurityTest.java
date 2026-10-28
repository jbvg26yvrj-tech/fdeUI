package ru.spasibo.bilt.fdeapi.observability;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import ru.spasibo.bilt.fdeapi.config.ManagementSecurityConfig;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringJUnitWebConfig(ManagementSecurityTest.Config.class)
@TestPropertySource(properties="management.server.port=9090")
class ManagementSecurityTest {
    @Autowired WebApplicationContext context;
    @Configuration @EnableWebSecurity @EnableWebMvc @Import(ManagementSecurityConfig.class)
    static class Config {
        @Bean SecurityFilterChain application(HttpSecurity http) throws Exception {
            return http.authorizeHttpRequests(auth -> auth.requestMatchers("/actuator/**").denyAll().anyRequest().permitAll()).build();
        }
        @Bean Endpoints endpoints() { return new Endpoints(); }
    }
    @RestController static class Endpoints {
        @GetMapping({"/actuator/prometheus", "/actuator/health", "/api/v1/example", "/actuator/env"}) String get() { return "ok"; }
    }
    MockMvc mvc() { return MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build(); }
    @Test void metricsOnlyAllowedOnManagementConnector() throws Exception {
        mvc().perform(get("/actuator/prometheus").with(req -> { req.setLocalPort(9090); return req; })).andExpect(status().isOk());
        mvc().perform(get("/actuator/prometheus").with(req -> { req.setLocalPort(8082); return req; })).andExpect(status().isForbidden());
    }
    @Test void managementConnectorCannotExposeApplicationOrSensitiveActuatorEndpoints() throws Exception {
        for (String path : new String[]{"/api/v1/example", "/actuator/env"}) {
            mvc().perform(get(path).with(req -> { req.setLocalPort(9090); return req; })).andExpect(status().isForbidden());
        }
    }
}
