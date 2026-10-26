package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceData;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceDefinition;
import ru.spasibo.bilt.fdeapi.domain.port.ResourcePort;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Синхронизирует значения enum {@link ResourceDefinition} с таблицей {@code auth.resources}.
 * Выполняется при запуске приложения: создаёт отсутствующие ресурсы, обновляет изменившиеся.
 * Переработан для использования ResourcePort вместо JPA-репозитория.
 * Логирует устаревшие ресурсы, которые есть в БД, но отсутствуют в enum.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResourceSyncService {

    private final ResourcePort resourcePort;

    /**
     * Синхронизирует определения ресурсов из enum в базу данных.
     * Создаёт новые ресурсы, если они отсутствуют, обновляет имя/тип, если они различаются.
     * Логирует устаревшие ресурсы, найденные в БД, которых больше нет в enum.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void syncResources() {
        log.info("Синхронизация определений ресурсов...");
        int created = 0;
        int updated = 0;

        Set<String> enumCodes = Arrays.stream(ResourceDefinition.values())
                .map(ResourceDefinition::getCode)
                .collect(Collectors.toSet());

        for (ResourceDefinition definition : ResourceDefinition.values()) {
            var existing = resourcePort.findByCode(definition.getCode());

            if (existing.isEmpty()) {
                resourcePort.saveOrUpdate(
                        definition.getCode(),
                        definition.getName(),
                        null,
                        definition.getType().name());
                created++;
            } else {
                ResourceData data = existing.get();
                boolean nameChanged = !definition.getName().equals(data.name());
                boolean typeChanged = !definition.getType().name().equals(data.type());

                if (nameChanged || typeChanged) {
                    resourcePort.saveOrUpdate(
                            definition.getCode(),
                            definition.getName(),
                            data.description(),
                            definition.getType().name());
                    updated++;
                }
            }
        }

        // Обнаружение устаревших ресурсов (есть в БД, но отсутствуют в enum)
        Set<String> dbCodes = resourcePort.findAllCodes();
        Set<String> staleCodes = dbCodes.stream()
                .filter(code -> !enumCodes.contains(code))
                .collect(Collectors.toSet());

        if (!staleCodes.isEmpty()) {
            log.info("Найдено устаревших ресурсов в БД, отсутствующих в enum ResourceDefinition: {} ({})",
                    staleCodes.size(), staleCodes);
        }

        log.info("Синхронизация ресурсов завершена: создано {}, обновлено {}, всего определений {}",
                created, updated, ResourceDefinition.values().length);
    }
}