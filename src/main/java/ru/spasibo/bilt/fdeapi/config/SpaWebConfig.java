package ru.spasibo.bilt.fdeapi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Настраивает Spring MVC для отдачи React SPA.
 * Все запросы, не относящиеся к API и не указывающие на существующий
 * статический файл, перенаправляются на index.html, чтобы клиентской
 * маршрутизацией занимался React Router.
 */
@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource resource = location.createRelative(resourcePath);
                        // Если запрошенный ресурс существует (JS, CSS, картинки) — отдаём его.
                        // Иначе — отдаём index.html для клиентской маршрутизации SPA.
                        if (resource.exists() && resource.isReadable()) {
                            return resource;
                        }
                        return new ClassPathResource("/static/index.html");
                    }
                });
    }
}
