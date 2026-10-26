package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.domain.Specification;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilter;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilterSpecifications;
import ru.spasibo.bilt.fdeapi.util.jpa.SpecificationUtils;

import java.util.Collection;

public class ResourceSpecifications {

    private ResourceSpecifications() {
    }

    /**
     * Поиск по коду ресурса (регистронезависимый LIKE).
     */
    public static Specification<ResourceEntity> codeLike(String code) {
        return SpecificationUtils.like("code", code);
    }

    /**
     * Точное совпадение по типу ресурса (API, PAGE, TABLE и т.д.).
     * Тип — это перечисление, поэтому точное совпадение.
     */
    public static Specification<ResourceEntity> typeEquals(String type) {
        return (root, query, cb) -> cb.equal(root.get("type"), type);
    }

    /**
     * Поиск по названию ресурса (регистронезависимый LIKE).
     */
    public static Specification<ResourceEntity> nameLike(String name) {
        return SpecificationUtils.like("name", name);
    }

    /**
     * Поиск по описанию ресурса (регистронезависимый LIKE).
     */
    public static Specification<ResourceEntity> descriptionLike(String description) {
        return SpecificationUtils.like("description", description);
    }

    public static Specification<ResourceEntity> createdAtCondition(DateFilter dateFilter) {
        return DateFilterSpecifications.buildDateCondition("createdAt", dateFilter);
    }

    public static Specification<ResourceEntity> codeIn(Collection<String> codes) {
        return (root, query, cb) -> root.get("code").in(codes);
    }
}