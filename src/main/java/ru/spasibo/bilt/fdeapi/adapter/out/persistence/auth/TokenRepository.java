package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data repository для entity refresh token в схеме auth.
 */
@Repository
public interface TokenRepository extends JpaRepository<TokenEntity, UUID> {

    Optional<TokenEntity> findByUserId(UUID userId);

    /** Поиск entity token по значению refresh token (необходимо для процесса обновления). */
    Optional<TokenEntity> findByRefreshToken(String refreshToken);

    /** Требует @Modifying + @Transactional для delete через derived-query. */
    @Modifying
    @Transactional
    void deleteByUserId(UUID userId);

    /** Удаление entity token по значению refresh token (необходимо для logout по token). */
    @Modifying
    @Transactional
    void deleteByRefreshToken(String refreshToken);

    /**
     * Атомарное compare-and-delete для ротации refresh token.
     * Возвращает количество удалённых строк (0 = token не найден / уже использован, 1 = успех).
     *
     * @param userId       идентификатор пользователя
     * @param refreshToken refresh token для сопоставления
     * @return количество удалённых строк
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM TokenEntity t WHERE t.userId = :userId AND t.refreshToken = :refreshToken")
    int deleteByUserIdAndRefreshToken(@Param("userId") UUID userId, @Param("refreshToken") String refreshToken);
}