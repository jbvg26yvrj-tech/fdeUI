package ru.spasibo.bilt.fdeapi.adapter.out.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.TokenEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.TokenRepository;
import ru.spasibo.bilt.fdeapi.config.JwtProperties;
import ru.spasibo.bilt.fdeapi.domain.model.TokenPair;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

/**
 * Генерация, валидация и разбор JWT-токенов, а также сохранение refresh-токенов.
 * Находится в слое адаптеров, так как зависит от библиотеки JJWT и JPA-репозитория.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenServiceImpl implements TokenPort {

    private static final String CLAIM_LOGIN = "login";
    private static final String CLAIM_ACTIVATED = "activated";
    private static final String CLAIM_PASSWORD_CHANGE_REQUIRED = "pwd_change";

    /**
     * Допустимое расхождение часов (clock skew) для разбора истёкших access-токенов
     * в процессе обновления (refresh).
     * Вычисляется как время жизни refresh-токена + буфер 5 минут.
     */
    private long refreshParseClockSkewSeconds;

    private final JwtProperties jwtProperties;
    private final TokenRepository tokenRepository;

    /** Кэшированный ключ подписи access-токена. */
    private SecretKey accessKey;

    /** Кэшированный ключ подписи refresh-токена. */
    private SecretKey refreshKey;

    @PostConstruct
    void initKeys() {
        this.accessKey = Keys.hmacShaKeyFor(
                jwtProperties.getAccessSecret().getBytes(StandardCharsets.UTF_8));
        this.refreshKey = Keys.hmacShaKeyFor(
                jwtProperties.getRefreshSecret().getBytes(StandardCharsets.UTF_8));
        // Расхождение часов = время жизни refresh-токена (мс -> с) + буфер 5 минут
        this.refreshParseClockSkewSeconds = jwtProperties.getRefreshExpiration() / 1000 + 300;
        log.info("Ключи подписи JWT инициализированы, допуск расхождения часов при разборе refresh: {}с", refreshParseClockSkewSeconds);
    }

    // ---- Генерация токенов ----

    @Override
    public TokenPair generateTokenPair(UserPrincipal principal) {
        String accessToken = generateAccessToken(principal);
        String refreshToken = generateRefreshToken(principal);

        log.debug("Сгенерирована пара токенов для пользователя: {}", principal.login());
        return new TokenPair(accessToken, refreshToken);
    }

    // ---- Валидация токенов ----

    @Override
    public boolean validateAccessToken(String token) {
        return validateToken(token, accessKey);
    }

    @Override
    public boolean validateRefreshToken(String token) {
        return validateToken(token, refreshKey);
    }

    /**
     * Возвращает конкретную причину невалидности токена или null, если токен валиден.
     * Используется JwtAuthenticationFilter для установки конкретных атрибутов ошибки.
     *
     * @param token JWT access-токен
     * @return "token_expired", если токен истёк, "token_invalid" при любой другой ошибке, или null, если токен валиден
     */
    @Override
    public String getAccessTokenError(String token) {
        try {
            Jwts.parser()
                    .verifyWith(accessKey)
                    .build()
                    .parseSignedClaims(token);
            return null; // валиден
        } catch (ExpiredJwtException e) {
            return "token_expired";
        } catch (Exception e) {
            return "token_invalid";
        }
    }

    // ---- Разбор токенов ----

    @Override
    public UserPrincipal parseUserFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .clockSkewSeconds(refreshParseClockSkewSeconds)
                    .verifyWith(accessKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            return extractPrincipal(claims);
        } catch (Exception e) {
            log.error("Не удалось разобрать пользователя из токена: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public UserPrincipal extractUserFromAccessToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(accessKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            return extractPrincipal(claims);
        } catch (Exception e) {
            log.error("Не удалось извлечь пользователя из access-токена: {}", e.getMessage());
            return null;
        }
    }

    // ---- Сохранение refresh-токенов ----

    @Override
    @Transactional
    public void saveRefreshToken(UUID userId, String refreshToken) {
        Optional<TokenEntity> existing = tokenRepository.findByUserId(userId);

        if (existing.isPresent()) {
            TokenEntity entity = existing.get();
            entity.setRefreshToken(refreshToken);
            tokenRepository.save(entity);
            log.debug("Обновлён refresh-токен для пользователя: {}", userId);
        } else {
            TokenEntity entity = TokenEntity.builder()
                    .userId(userId)
                    .refreshToken(refreshToken)
                    .build();
            tokenRepository.save(entity);
            log.debug("Сохранён новый refresh-токен для пользователя: {}", userId);
        }
    }

    @Override
    @Transactional
    public void revokeRefreshToken(UUID userId) {
        tokenRepository.deleteByUserId(userId);
        log.debug("Отозван refresh-токен для пользователя: {}", userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isRefreshTokenValid(UUID userId, String refreshToken) {
        return tokenRepository.findByUserId(userId)
                .map(entity -> entity.getRefreshToken().equals(refreshToken))
                .orElse(false);
    }

    /**
     * Атомарная операция compare-and-delete для ротации refresh-токена.
     * Удаляет токен только если он совпадает одновременно по userId и refreshToken.
     * Возвращает true, если была удалена ровно одна строка (токен был валиден и использован).
     */
    @Override
    @Transactional
    public boolean atomicReplaceRefreshToken(UUID userId, String refreshToken) {
        int deletedCount = tokenRepository.deleteByUserIdAndRefreshToken(userId, refreshToken);
        if (deletedCount == 0) {
            log.warn("Атомарная замена refresh-токена не удалась для пользователя: {} (токен не найден или уже использован)", userId);
            return false;
        }
        log.debug("Атомарно использован refresh-токен для пользователя: {}", userId);
        return true;
    }

    // ---- Приватные вспомогательные методы ----

    private String generateAccessToken(UserPrincipal principal) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(principal.id().toString())
                .claim(CLAIM_LOGIN, principal.login())
                .claim(CLAIM_ACTIVATED, principal.activated())
                .claim(CLAIM_PASSWORD_CHANGE_REQUIRED, principal.passwordChangeRequired())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(jwtProperties.getAccessExpiration())))
                .signWith(accessKey)
                .compact();
    }

    private String generateRefreshToken(UserPrincipal principal) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(principal.id().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(jwtProperties.getRefreshExpiration())))
                .signWith(refreshKey)
                .compact();
    }

    private boolean validateToken(String token, SecretKey key) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            log.debug("Проверка токена не пройдена: {}", e.getMessage());
            return false;
        }
    }

    private UserPrincipal extractPrincipal(Claims claims) {
        UUID userId = UUID.fromString(claims.getSubject());
        String login = claims.get(CLAIM_LOGIN, String.class);
        Boolean activated = claims.get(CLAIM_ACTIVATED, Boolean.class);
        Boolean pwdChangeRequired = claims.get(CLAIM_PASSWORD_CHANGE_REQUIRED, Boolean.class);

        return new UserPrincipal(
                userId,
                login,
                activated != null ? activated : true,
                pwdChangeRequired != null ? pwdChangeRequired : false
        );
    }
}