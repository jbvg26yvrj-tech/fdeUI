package ru.spasibo.bilt.fdeapi.domain.port;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Порт операций управления пользователями (административный CRUD).
 * Отделён от {@link AuthUserPort} для соблюдения принципа разделения интерфейсов (ISP).
 */
public interface UserManagementPort {

    /**
     * Возвращает постраничный список всех пользователей.
     *
     * @param pageable параметры пагинации
     * @return страница данных пользователей
     */
    Page<AuthUserData> findAll(Pageable pageable);

    /**
     * Находит пользователя по идентификатору.
     *
     * @param id UUID пользователя
     * @return данные пользователя, если найден
     */
    Optional<AuthUserData> findById(UUID id);

    /**
     * Обновляет свойства пользователя одной операцией.
     * Применяются только значения, отличные от null.
     *
     * @param userId                 UUID пользователя
     * @param activated              новый статус активации (nullable — пропустить, если null)
     * @param passwordChangeRequired новое значение флага (nullable — пропустить, если null)
     * @return обновлённые данные пользователя
     */
    AuthUserData update(UUID userId, Boolean activated, Boolean passwordChangeRequired);

    /**
     * Удаляет пользователя по идентификатору.
     *
     * @param userId UUID пользователя
     */
    void delete(UUID userId);

    /**
     * Возвращает общее количество пользователей.
     *
     * @return количество пользователей
     */
    long count();

    /**
     * Создаёт нового пользователя с настройками, заданными администратором.
     *
     * @param login        логин пользователя
     * @param passwordHash пароль, захешированный bcrypt
     * @param activated    активирован ли пользователь
     * @return данные созданного пользователя
     */
    AuthUserData save(String login, String passwordHash, boolean activated);

    Set<String> findUserCodesByRoleIds(Collection<UUID> roleIds);
}