package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.domain.Specification;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilter;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilterSpecifications;
import ru.spasibo.bilt.fdeapi.util.jpa.SpecificationUtils;

public class RoleSpecifications {

    private RoleSpecifications() {
    }

    /**
     * Поиск по коду роли (регистронезависимый LIKE).
     */
    public static Specification<RoleEntity> codeLike(String code) {
        return SpecificationUtils.like("code", code);
    }

    /**
     * Поиск по названию роли (регистронезависимый LIKE).
     */
    public static Specification<RoleEntity> nameLike(String name) {
        return SpecificationUtils.like("name", name);
    }

    /**
     * Поиск по описанию роли (регистронезависимый LIKE).
     */
    public static Specification<RoleEntity> descriptionLike(String description) {
        return SpecificationUtils.like("description", description);
    }

    public static Specification<RoleEntity> createdAtCondition(DateFilter dateFilter) {
        return DateFilterSpecifications.buildDateCondition("createdAt", dateFilter);
    }
}