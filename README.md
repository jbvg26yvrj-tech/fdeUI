# fde-api

BFF / API-gateway сервиса **FDE 2.0** (File Data Exchange) для веб-интерфейса (UI).

## Назначение

`fde-api` — единая точка входа для UI. Сервис решает три задачи:

- **Аутентификация и авторизация** — выдача и обновление JWT-токенов, проверка прав
  (RBAC) и ограничение видимости строк данных (RLS).
- **CRUD пайплайнов** и связанных сущностей (роли, пользователи, ресурсы, RLS-фильтры,
  настройки пользователя), а также чтение сессий выполнения.
- **Прозрачное проксирование** запросов управления расписаниями и запуском пайплайнов
  в сервис `fde-dispatcher` (эндпоинты `/api/v1/schedules/*`, `/api/v1/triggers/*`).

## Принцип работы

### Аутентификация (JWT, access + refresh)

- При успешном входе (`POST /api/v1/auth/login`) выдаётся **access-токен** (в теле ответа)
  и **refresh-токен** (в httpOnly-cookie с путём `/api/v1/auth`).
- Защищённые запросы передают access-токен в заголовке `Authorization: Bearer <token>`.
- По истечении access-токена UI вызывает `POST /api/v1/auth/refresh` — на основе
  (возможно просроченного) access-токена и refresh-cookie выдаётся новая пара токенов.
- `logout` и смена пароля отзывают refresh-токен в БД и очищают cookie.

Токены, пароли и секреты **никогда не попадают в логи** — логируются только `login`/`userId`.

### RBAC / RLS

- `ADMIN` управляет потоками, запусками, расписаниями, пользователями и настройками.
- Остальные роли с заполненными `clientCodes` автоматически получают только просмотр
  потоков, сессий, аналитики и расписаний. Старые назначения ресурсов не дают прав управления.
- Поток доступен, если его источник **или** получатель точно совпадает с одним из кодов
  клиентов пользователя (без учёта регистра и крайних пробелов). `DWH-TEST` не равен `DWH`.
- Области нескольких ролей объединяются; существующие дополнительные RLS-фильтры
  продолжают ограничивать видимые данные. Без области доступа доступны только информация
  о системе и личные настройки отображения.
- Серверные проверки `@PreAuthorize` / `PermissionService` применяются независимо от UI.
  Меню клиентского пользователя: потоки, сессии, аналитика и информация о системе.
- Cron доступен в списке и карточке потока; часовой пояс показывается только при наличии
  в ответе dispatcher. Проверка на стенде: `ops/test-stand/smoke_client_viewer.py`.

### Проксирование в dispatcher

Контроллеры `ScheduleProxyController` и `TriggerProxyController` валидируют существование
пайплайна (где применимо) и пересылают тело запроса в `fde-dispatcher` через `WebClient`
с настроенными таймаутами и Resilience4j (circuit breaker + retry).

## Архитектура

Clean / Hexagonal (Ports & Adapters):

```
adapter/in/rest       — REST-контроллеры, DTO, GlobalExceptionHandler
adapter/out/persistence — JPA-сущности и репозитории (схемы pipelines, auth, sessions)
adapter/out/dispatcher  — клиент к fde-dispatcher
adapter/out/security    — реализация работы с JWT-токенами
application/service   — бизнес-логика (use cases)
domain/{model,port,exception} — доменные модели, порты, доменные исключения
config                — Security, CORS, JWT, WebClient, OpenAPI, SPA
```

## Конфигурация и учётные данные

Все секреты и адреса задаются через переменные окружения (см. `env.example`).
В обязательных переменных значений по умолчанию в `application.yml` нет — приложение
не стартует без них.

| Переменная | Назначение | Обязательна | Значение по умолчанию |
|------------|-----------|:-----------:|------------------------|
| `DB_HOST` | Хост PostgreSQL | да | — |
| `DB_PORT` | Порт PostgreSQL | да | — |
| `DB_NAME` | Имя БД | да | — |
| `DB_USERNAME` | Пользователь БД | да | — |
| `DB_PASSWORD` | Пароль БД | да | — |
| `FDE_DISPATCHER_URL` | Базовый URL fde-dispatcher | да | — |
| `CORS_ALLOWED_ORIGINS` | Разрешённые origin'ы UI (через запятую) | да | — |
| `JWT_ACCESS_SECRET` | Секрет подписи access-токенов | да | — |
| `JWT_REFRESH_SECRET` | Секрет подписи refresh-токенов | да | — |
| `SERVER_PORT` | Порт HTTP-сервера | нет | `8082` |
| `FDE_DISPATCHER_CONNECT_TIMEOUT` | Таймаут соединения | нет | `5s` |
| `FDE_DISPATCHER_RESPONSE_TIMEOUT` | Таймаут ответа | нет | `30s` |
| `JWT_ACCESS_EXPIRATION` | Время жизни access-токена (мс) | нет | `600000` |
| `JWT_REFRESH_EXPIRATION` | Время жизни refresh-токена (мс) | нет | `9000000` |
| `LOG_LEVEL` | Уровень логирования сервиса | нет | `INFO` |

### Построение учётных данных

- **БД** — берётся из переменных окружения; в Kubernetes из `Secret int-postgres`.
- **JWT-секреты** — берутся из `Secret web-ui` (ключи `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`). Требования к стойкости (валидируются `JwtProperties`):
  - длина **не менее 32 символов**;
  - не должны содержать слово `default`.
  - Генерация, например: `openssl rand -base64 48`.
- **CORS** — список origin'ов UI; в Kubernetes из `Secret web-ui`
  (ключ `CORS_ALLOWED_ORIGINS`).

## Сборка и запуск

`mvnw` в проекте нерабочий — используйте системный `mvn`.

```bash
# Сборка без фронтенда (быстрее; UI-профиль активен по умолчанию)
mvn clean package -DskipUI

# Запуск
DB_HOST=localhost DB_PORT=5432 DB_NAME=fde_dispatcher \
DB_USERNAME=postgres DB_PASSWORD=*** \
FDE_DISPATCHER_URL=http://localhost:8080 \
CORS_ALLOWED_ORIGINS=http://localhost:5173 \
JWT_ACCESS_SECRET=*** JWT_REFRESH_SECRET=*** \
java -jar target/fde-api-2.0.0.jar
```

## Swagger UI

- Swagger UI: `http://<host>:<port>/swagger-ui.html`
- OpenAPI JSON: `http://<host>:<port>/v3/api-docs`
- Снимок спецификации хранится в `src/main/resources/swagger/openapi.json`.

Сгенерировать `openapi.json` из запущенного приложения можно профилем Maven:

```bash
mvn verify -Popenapi
```

### Авторизация в Swagger UI

1. Получите access-токен через `POST /api/v1/auth/login`.
2. Нажмите кнопку **Authorize** (схема `bearerAuth`).
3. Введите токен **без** префикса `Bearer` — Swagger добавит его сам.
4. После этого защищённые эндпоинты будут вызываться с заголовком
   `Authorization: Bearer <token>`.
