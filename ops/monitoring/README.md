# Мониторинг FDE в Kubernetes

## Подключение

API пишет JSON в stdout. Для Loki используйте существующий сборщик Kubernetes (Grafana Alloy/Fluent Bit), добавив labels namespace/pod/container/application. Файловый том для логов API не нужен. Настройте хранение в Loki отдельно от аудита PostgreSQL. Секреты не передаются в метрики; логины, ID потоков и correlation ID не должны быть labels Prometheus.

Приложение слушает основной порт SERVER_PORT (8080 в k8s/deployment.yaml, 8082 на тестовом стенде) и служебный MANAGEMENT_SERVER_PORT=9090. Service/Ingress приложения направляйте только на основной порт. Не публикуйте 9090 через NodePort/LoadBalancer/Ingress. На 9090 разрешены только GET health и prometheus; на основном порту actuator запрещён.

1. Обновите Deployment: named port management=9090, основной http; probes /livez и /readyz на основном порту. Не применяйте старый production Deployment целиком к тестовому стенду: image/Secrets отличаются.
2. Примените service.yaml и адаптированную network-policy.yaml. NetworkPolicy требует CNI с поддержкой политик. Существующие allow-all политики складываются с этой и могут разрешать 9090 — проверьте реальные подключения. Политика допускает основной порт из любых источников, сохраняя существующую маршрутизацию; ограничьте его отдельно по ingress архитектуре. Kubelet должен достигать probes. Мониторинг разрешён только pod с app.kubernetes.io/name=prometheus в namespace monitoring; замените selectors на реальные.
3. Для Prometheus Operator примените service-monitor.yaml и согласуйте его labels/namespace с selectors Prometheus. Без Operator добавьте prometheus-scrape.yaml в scrape_configs и выдайте Prometheus list/watch/get pods в namespace fde. Не включайте оба способа одновременно. Job должен называться fde-api для dashboard/alerts.
4. Загрузите alerts.yaml как rule file либо заверните groups в spec PrometheusRule. Импортируйте grafana-dashboard.json и выберите datasource. Проверка правил: `promtool check rules ops/monitoring/alerts.yaml`.
5. Для внешней проверки добавьте модуль из blackbox.yaml в существующий blackbox_exporter и job из blackbox-scrape.yaml в Prometheus. Замените fde.example.org и адрес exporter. Проверка TLS обязательна. Внешний exporter лучше размещать за пределами кластера: иначе отказ всего кластера может скрыть сигнал. Эта проверка проверяет HTML/HTTPS, но не исполнение JavaScript и успешный вход; для них нужна отдельная браузерная synthetic-проверка с выделенной учёткой.
6. Настройте Alertmanager receiver и маршрутизацию critical/warning по вашему каналу дежурства. Сами файлы не отправляют уведомления без работающего Prometheus/Alertmanager. Новая установка monitoring stack этим релизом не выполняется.

## Проверки после выкладки

- Через основной Service GET /livez и /readyz -> 200; при graceful shutdown readiness снимается.
- Из разрешённого monitoring pod GET http://fde-api-management.fde.svc:9090/actuator/prometheus -> 200; из непривилегированного namespace соединение блокируется CNI.
- Из браузерного ingress /actuator/prometheus -> 403/404; /api/v1/audit доступен только ADMIN.
- В Prometheus Targets каждый API pod присутствует отдельно. При scale/restart series меняется, rate/increase учитывают counter reset. Счётчик количества потоков глобальный для общей БД: агрегировать max, не sum по репликам.
- Проверьте срабатывание тестового алерта и его доставку дежурному. No data не означает здоровое состояние.

## Диагностика

FdeApiUnavailable: проверьте pods/events, rollout, readiness, БД, ServiceMonitor/NetworkPolicy. FdeAuditWriteFailure: событие результата не записано, найдите JSON log по correlationId; проверьте БД, место, права. Атомарная ошибка вставки аудита при изменении данных откатывает изменение и видна также как 5xx; метрика ошибок независимых записей не заменяет проверку 5xx.

FdeDispatcherUnavailable: панель продолжает обслуживать чтение/диагностику; выполнение зависит от восстановления dispatcher. Liveness не включает внешние системы, readiness включает БД, но не dispatcher. Это предотвращает перезапуски API из-за внешнего сбоя и сохраняет панель для диагностики.

Состояние dispatcher проверяется отдельно каждые 30 секунд, счётчик потоков — каждые 60 секунд; scrape использует кэш. Alерт устаревания проверки выявляет зависший scheduler. При нескольких репликах каждая проверяет свою доступность зависимости. JVM heap и Hikari pool доступны из Actuator; CPU/OOM/restarts/PVC capacity собираются средствами Kubernetes (kube-state-metrics/cAdvisor), не самим приложением.

## Аудит и хранение

Аудит находится в PostgreSQL, не в pod. Доступ к журналу через API только на чтение для ADMIN. Это не защита от владельца БД/superuser: для нормативно неизменяемого журнала нужен внешний SIEM/архив с отдельными правами. Сохраняйте БД во внешних резервных копиях, проверяйте восстановление и рост audit.events. Автоматического удаления записей в этой версии нет; срок хранения и выгрузку согласуйте с владельцем АС, затем выполняйте через отдельную административную процедуру.

Один пользовательский запрос может иметь отдельную запись результата HTTP и несколько атомарных изменений строк; связывайте их по correlationId. ACCEPTED означает принятие внешней команды, не завершение передачи. UNKNOWN означает неопределённый результат при сбое связи — проверьте сессию перед повтором команды. История начинается после установки миграции; прошлые изменения задним числом не восстанавливаются.

## Источники

Порты и probes соответствуют [Spring Boot 3.5 management](https://docs.spring.io/spring-boot/3.5/reference/actuator/monitoring.html) и [Actuator endpoints](https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html).
