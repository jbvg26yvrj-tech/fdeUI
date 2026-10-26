package ru.spasibo.bilt.fdeapi.domain.port;

import ru.spasibo.bilt.fdeapi.domain.model.RlsFilter;
import ru.spasibo.bilt.fdeapi.domain.model.UserRls;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Порт операций персистентности фильтров Row-Level Security (RLS).
 * Абстрагирует слой адаптеров, чтобы сервисы приложения не зависели от JPA-сущностей.
 */
public interface RlsPort {

    /**
     * Возвращает агрегированные RLS-фильтры пользователя по всем назначенным ролям.
     *
     * @param userId UUID пользователя
     * @return агрегированный RLS с отображением кода ресурса на фильтр
     */
    UserRls getUserRls(UUID userId);

    /**
     * Возвращает RLS-фильтр для конкретной пары роль-ресурс.
     *
     * @param roleId     UUID роли
     * @param resourceId UUID ресурса
     * @return JSON-строка фильтра, если найдена
     */
    Optional<String> getRlsFilter(UUID roleId, UUID resourceId);

    /**
     * Возвращает все RLS-фильтры для указанной роли.
     *
     * @param roleId UUID роли
     * @return список доменных объектов RLS-фильтров
     */
    List<RlsFilter> getRlsForRole(UUID roleId);

    /**
     * Создаёт или обновляет RLS-фильтр для пары роль-ресурс.
     *
     * @param roleId     UUID роли
     * @param resourceId UUID ресурса
     * @param filter     JSON-строка фильтра
     */
    void saveRlsFilter(UUID roleId, UUID resourceId, String filter);

    /**
     * Удаляет RLS-фильтр для пары роль-ресурс.
     *
     * @param id UUID ресурса
     */
    void deleteRlsFilter(UUID id);
}