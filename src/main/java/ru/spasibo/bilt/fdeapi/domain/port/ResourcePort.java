package ru.spasibo.bilt.fdeapi.domain.port;

import ru.spasibo.bilt.fdeapi.domain.model.ResourceData;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Порт операций персистентности ресурсов (прав доступа).
 * Абстрагирует слой адаптеров, чтобы сервисы приложения не зависели от JPA-сущностей.
 */
public interface ResourcePort {

    /**
     * Находит ресурс по идентификатору.
     *
     * @param id UUID ресурса
     * @return данные ресурса, если найден
     */
    Optional<ResourceData> findById(UUID id);

    /**
     * Находит ресурс по коду.
     *
     * @param code уникальный код ресурса
     * @return данные ресурса, если найден
     */
    Optional<ResourceData> findByCode(String code);

    /**
     * Проверяет, существует ли ресурс с указанным кодом.
     *
     * @param code код ресурса
     * @return true, если ресурс существует
     */
    boolean existsByCode(String code);

    /**
     * Проверяет, существует ли ресурс с указанным идентификатором.
     *
     * @param id UUID ресурса
     * @return true, если ресурс существует
     */
    boolean existsById(UUID id);

    /**
     * Возвращает все ресурсы.
     *
     * @return список всех ресурсов
     */
    List<ResourceData> findAll();

    /**
     * Возвращает все ресурсы указанного типа.
     *
     * @param type тип ресурса (например, "API", "PAGE")
     * @return отфильтрованный список ресурсов
     */
    List<ResourceData> findByType(String type);

    /**
     * Создаёт или обновляет ресурс по коду.
     * Если ресурс с указанным кодом существует, обновляет его имя и тип.
     * Иначе создаёт новый ресурс.
     *
     * @param code        уникальный код ресурса
     * @param name        отображаемое имя
     * @param description необязательное описание
     * @param type        строковый тип ресурса
     * @return сохранённые или обновлённые данные ресурса
     */
    ResourceData saveOrUpdate(String code, String name, String description, String type);

    /**
     * Возвращает набор кодов ресурсов, назначенных любой из указанных ролей.
     * Выполняет один пакетный запрос вместо N+1.
     *
     * @param roleIds коллекция UUID ролей
     * @return набор кодов ресурсов
     */
    Set<String> findResourceCodesByRoleIds(Collection<UUID> roleIds);

    /**
     * Возвращает все коды ресурсов, присутствующие в базе данных.
     * Используется ResourceSyncService для выявления устаревших ресурсов.
     *
     * @return набор всех кодов ресурсов
     */
    Set<String> findAllCodes();

    /**
     * Возвращает отображение ID ресурса на код ресурса для указанных ID.
     * Один пакетный запрос вместо N+1 поисков на каждый ресурс.
     *
     * @param ids коллекция UUID ресурсов
     * @return отображение ID ресурса на код
     */
    Map<UUID, String> findCodesByIds(Collection<UUID> ids);
}