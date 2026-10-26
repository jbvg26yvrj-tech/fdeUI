package ru.spasibo.bilt.fdeapi.util.rls;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserResponse;

import java.util.Optional;
import java.util.function.Function;

public abstract class AbstractRlsService<T, F extends Filter, R extends JpaRepository<T, ?> & JpaSpecificationExecutor<T>> {

    protected final R repository;
    protected final RlsSpecificationBuilder rlsSpecificationBuilder;

    protected AbstractRlsService(R repository, RlsSpecificationBuilder rlsSpecificationBuilder) {
        this.repository = repository;
        this.rlsSpecificationBuilder = rlsSpecificationBuilder;
    }

    /**
     * Получить страницу с применением фильтра и RLS.
     * @param filter пользовательский фильтр
     * @param pageable пагинация
     * @param resourceCode код ресурса для RLS
     * @param baseSpec функция, строящая базовую спецификацию по фильтру
     * @return страница сущностей
     */
    protected Page<T> findPageWithRls(F filter, Pageable pageable, String resourceCode,
                                      Function<F, Specification<T>> baseSpec) {
        UserResponse currentUser = (UserResponse) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Specification<T> base = baseSpec.apply(filter);
        Specification<T> rlsSpec = rlsSpecificationBuilder.buildSpecification(resourceCode, getEntityClass());
        Specification<T> finalSpec = base.and(rlsSpec);
        return repository.findAll(finalSpec, pageable);
    }

    /**
     * Найти одну сущность с применением RLS.
     * @param additionalSpec дополнительная спецификация (например, по id)
     * @param resourceCode код ресурса для RLS
     * @return Optional с сущностью
     */
    protected Optional<T> findOneWithRls(Specification<T> additionalSpec, String resourceCode) {
        UserResponse currentUser = (UserResponse) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Specification<T> rlsSpec = rlsSpecificationBuilder.buildSpecification(resourceCode, getEntityClass());
        Specification<T> finalSpec = additionalSpec == null ? rlsSpec : additionalSpec.and(rlsSpec);
        return repository.findOne(finalSpec);
    }

    protected abstract Class<T> getEntityClass();
}