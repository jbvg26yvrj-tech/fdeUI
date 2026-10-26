package ru.spasibo.bilt.fdeapi.domain.port;

import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Порт операций персистентности пользователей, необходимых сервису аутентификации.
 * Абстрагирует слой адаптеров, чтобы AuthService не зависел от JPA-сущностей.
 */
public interface AuthUserPort {

    /**
     * Находит пользователя по логину.
     *
     * @param login логин пользователя
     * @return данные пользователя, если найден
     */
    Optional<AuthUserData> findByLogin(String login);

    /**
     * Находит пользователя по идентификатору.
     *
     * @param id UUID пользователя
     * @return данные пользователя, если найден
     */
    Optional<AuthUserData> findById(UUID id);

    /**
     * Проверяет, существует ли пользователь с указанным логином.
     *
     * @param login логин для проверки
     * @return true, если пользователь с таким логином существует
     */
    boolean existsByLogin(String login);

    /**
     * Находит несколько пользователей по их идентификаторам одним пакетным запросом.
     * Возвращает только существующих пользователей; отсутствующие ID молча игнорируются.
     *
     * @param ids коллекция UUID пользователей для поиска
     * @return список найденных данных пользователей
     */
    List<AuthUserData> findByIds(Collection<UUID> ids);

    /**
     * Создаёт нового пользователя с указанными учётными данными.
     *
     * @param login        логин пользователя
     * @param passwordHash пароль, захешированный bcrypt
     * @return сохранённые данные пользователя (со сгенерированным ID)
     */
    AuthUserData save(String login, String passwordHash);

    /**
     * Обновляет пароль пользователя и флаг passwordChangeRequired.
     *
     * @param userId                 идентификатор пользователя
     * @param passwordHash           новый пароль, захешированный bcrypt
     * @param passwordChangeRequired требуется ли ещё смена пароля
     */
    void updatePassword(UUID userId, String passwordHash, boolean passwordChangeRequired);
}