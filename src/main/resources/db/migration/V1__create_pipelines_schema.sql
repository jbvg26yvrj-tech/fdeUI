-- Создание schema pipelines (если не существует)
CREATE SCHEMA IF NOT EXISTS pipelines;

-- Таблица маршрутов
CREATE TABLE IF NOT EXISTS pipelines.pipelines (
    id UUID PRIMARY KEY,
    pipeline_name VARCHAR(255) NOT NULL,
    client_from VARCHAR(100) NOT NULL,
    client_to VARCHAR(100) NOT NULL,
    primary_datacenter VARCHAR(10) NOT NULL DEFAULT 'DC1',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Таблица задач маршрута
CREATE TABLE IF NOT EXISTS pipelines.tasks (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines.pipelines(id) ON DELETE CASCADE,
    task_order SMALLINT NOT NULL,
    type_code VARCHAR(50) NOT NULL,
    props JSONB NOT NULL,
    CONSTRAINT uk_task UNIQUE (pipeline_id, task_order)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tasks_pipeline_id ON pipelines.tasks(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_tasks_props ON pipelines.tasks USING GIN (props);

-- Комментарии
COMMENT ON TABLE pipelines.pipelines IS 'Конфигурация маршрутов обмена файлами';
COMMENT ON TABLE pipelines.tasks IS 'Задачи в составе маршрута';
COMMENT ON COLUMN pipelines.tasks.type_code IS 'Тип задачи: SftpDownloadTask, SftpUploadTask, SmbDownloadTask, etc.';
COMMENT ON COLUMN pipelines.tasks.props IS 'JSONB параметры задачи: sourceDir, fileMask, targetDir и т.д.';