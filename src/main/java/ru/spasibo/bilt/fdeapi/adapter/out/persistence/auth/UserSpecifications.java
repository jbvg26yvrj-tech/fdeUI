package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.domain.Specification;
import ru.spasibo.bilt.fdeapi.util.jpa.SpecificationUtils;

import java.util.Collection;

public class UserSpecifications {

    private UserSpecifications() {
    }

    /**
     * Поиск по логину пользователя (регистронезависимый LIKE).
     */
    public static Specification<UserEntity> loginLike(String login) {
        return SpecificationUtils.like("login", login);
    }

    /**
     * Точное совпадение по статусу активации.
     */
    public static Specification<UserEntity> activatedEquals(Boolean activated) {
        return (root, query, cb) -> cb.equal(root.get("activated"), activated);
    }

    /**
     * Точное совпадение по флагу "требуется смена пароля".
     */
    public static Specification<UserEntity> passwordChangeRequiredEquals(Boolean passwordChangeRequired) {
        return (root, query, cb) -> cb.equal(root.get("passwordChangeRequired"), passwordChangeRequired);
    }

    /**
     * Фильтр по списку логинов (точное вхождение).
     */
    public static Specification<UserEntity> loginIn(Collection<String> logins) {
        return (root, query, cb) -> root.get("login").in(logins);
    }
}