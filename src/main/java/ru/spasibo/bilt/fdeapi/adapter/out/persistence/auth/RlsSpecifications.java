package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Join;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilter;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilterSpecifications;
import ru.spasibo.bilt.fdeapi.util.jpa.SpecificationUtils;

import java.util.Collection;
import java.util.UUID;

public class RlsSpecifications {

    private RlsSpecifications() {
    }

    // Фильтр по roleId (точное совпадение, UUID)
    public static Specification<RoleRlsEntity> roleIdEquals(UUID roleId) {
        return (root, query, cb) -> cb.equal(root.get("roleId"), roleId);
    }

    // === Фильтры по полям связанной ResourceEntity ===

    /**
     * Поиск по коду ресурса (регистронезависимый LIKE).
     */
    public static Specification<RoleRlsEntity> resourceCodeLike(String resourceCode) {
        return (root, query, cb) -> {
            if (resourceCode == null || resourceCode.isBlank()) {
                return cb.conjunction();
            }
            Join<RoleRlsEntity, ResourceEntity> resourceJoin = root.join("resource");
            String escaped = SpecificationUtils.escapeWildcards(resourceCode);
            return cb.like(cb.lower(resourceJoin.get("code")), "%" + escaped.toLowerCase() + "%");
        };
    }

    // code in (коллекция) – оставляем точное вхождение
    public static Specification<RoleRlsEntity> resourceCodeIn(Collection<String> resourceCodes) {
        return (root, query, cb) -> {
            Join<RoleRlsEntity, ResourceEntity> resourceJoin = root.join("resource");
            return resourceJoin.get("code").in(resourceCodes);
        };
    }

    /**
     * Поиск по названию ресурса (регистронезависимый LIKE).
     */
    public static Specification<RoleRlsEntity> resourceNameLike(String namePart) {
        return (root, query, cb) -> {
            if (namePart == null || namePart.isBlank()) {
                return cb.conjunction();
            }
            Join<RoleRlsEntity, ResourceEntity> resourceJoin = root.join("resource");
            String escaped = SpecificationUtils.escapeWildcards(namePart);
            return cb.like(cb.lower(resourceJoin.get("name")), "%" + escaped.toLowerCase() + "%");
        };
    }

    /**
     * Поиск по описанию ресурса (регистронезависимый LIKE).
     */
    public static Specification<RoleRlsEntity> resourceDescriptionLike(String descriptionPart) {
        return (root, query, cb) -> {
            if (descriptionPart == null || descriptionPart.isBlank()) {
                return cb.conjunction();
            }
            Join<RoleRlsEntity, ResourceEntity> resourceJoin = root.join("resource");
            String escaped = SpecificationUtils.escapeWildcards(descriptionPart);
            return cb.like(cb.lower(resourceJoin.get("description")), "%" + escaped.toLowerCase() + "%");
        };
    }

    /**
     * Точное совпадение по типу ресурса (API, PAGE, TABLE и т.д.).
     */
    public static Specification<RoleRlsEntity> resourceTypeEquals(String type) {
        return (root, query, cb) -> {
            Join<RoleRlsEntity, ResourceEntity> resourceJoin = root.join("resource");
            return cb.equal(resourceJoin.get("type"), type);
        };
    }

    // type in (коллекция) – точное вхождение
    public static Specification<RoleRlsEntity> resourceTypeIn(Collection<String> types) {
        return (root, query, cb) -> {
            Join<RoleRlsEntity, ResourceEntity> resourceJoin = root.join("resource");
            return resourceJoin.get("type").in(types);
        };
    }

    public static Specification<RoleRlsEntity> createdAtCondition(DateFilter dateFilter) {
        return DateFilterSpecifications.buildDateCondition("createdAt", dateFilter);
    }
}