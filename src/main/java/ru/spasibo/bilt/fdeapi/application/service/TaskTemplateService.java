package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.ParamDefinition;
import ru.spasibo.bilt.fdeapi.domain.exception.ValidationException;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Сервис предоставляет шаблоны определений параметров (ParamDefinition)
 * для каждого поддерживаемого типа задачи пайплайна.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TaskTemplateService {

    // Допустимые типы задач — можно использовать из PipelineService, но для наглядности оставим здесь
    private static final Set<String> ALLOWED_TYPE_CODES = Set.of(
            "SftpDownloadTask", "SftpUploadTask", "SftpDeleteTask",
            "SmbDownloadTask", "SmbUploadTask", "SmbDeleteTask",
            "FtpsDownloadTask", "FtpsUploadTask", "FtpsDeleteTask",
            "MinioDownloadTask", "MinioUploadTask", "MinioDeleteTask"
    );

    // Хранилище шаблонов
    private static final Map<String, List<ParamDefinition>> TEMPLATES = Map.ofEntries(
            // SFTP Download
            Map.entry("SftpDownloadTask", List.of(
                    ParamDefinition.builder()
                            .name("fileMask")
                            .type("string")
                            .label("fileMask")
                            .required(true)
                            .minLength(1)
                            .maxLength(500)
                            .pattern(".*")
                            .placeholder("Маска для файла")
                            .description("Задача скачивает файлы, которые соответствуют маске")
                            .build(),
                    ParamDefinition.builder()
                            .name("maskType")
                            .type("string")
                            .label("maskType")
                            .required(true)
                            .minLength(1)
                            .maxLength(255)
                            .placeholder("Тип маски")
                            .defaultValue("REGEX")
                            .description("Укажите тип маски REGEX или GLOB")
                            .build(),
                    ParamDefinition.builder()
                            .name("recursive")
                            .type("boolean")
                            .label("recursive")
                            .required(false)
                            .defaultValue("false")
                            .description("Если рекурсивность = true, то файлы будут скачиваться в том числе из подкаталогов")
                            .build(),
                    ParamDefinition.builder()
                            .name("sourceDir")
                            .type("string")
                            .label("sourceDir")
                            .placeholder("Каталог источника")
                            .description("Каталог-источник из которого скачиваются файлы")
                            .required(true)
                            .build(),
                    ParamDefinition.builder()
                            .name("preserveStructure")
                            .type("boolean")
                            .label("preserveStructure")
                            .placeholder("Сохранить структуру")
                            .required(false)
                            .description("Укажите, необходимо ли сохранять структуру в директории получателя")
                            .build()
                    )),

            // SFTP Upload
            Map.entry("SftpUploadTask", List.of(
                    ParamDefinition.builder()
                            .name("targetDir")
                            .type("string")
                            .label("targetDir")
                            .placeholder("Целевая директория")
                            .required(true)
                            .description("Укажите целевую директорию, на которую будут загружаться файлы")
                            .build()
            )),

            // SFTP Delete
            Map.entry("SftpDeleteTask", List.of(
                    ParamDefinition.builder()
                            .name("sourceDir")
                            .type("string")
                            .label("sourceDir")
                            .placeholder("Каталог источника")
                            .required(true)
                            .description("Директория, из которой удаляются файлы")
                            .build()
            )),

            // SMB Download
            Map.entry("SmbDownloadTask", List.of(
                    ParamDefinition.builder()
                            .name("share")
                            .type("string")
                            .label("SMB шара")
                            .required(true)
                            .build()

            )),
            // SMB Upload
            Map.entry("SmbUploadTask", List.of(
                    ParamDefinition.builder()
                            .name("remoteDir")
                            .type("string")
                            .label("Удалённая директория")
                            .required(true)
                            .build()
            )),
            // SMB Delete
            Map.entry("SmbDeleteTask", List.of(
                    ParamDefinition.builder()
                            .name("sourceDir")
                            .type("string")
                            .label("sourceDir")
                            .placeholder("Каталог источника")
                            .required(true)
                            .description("Директория, из которой удаляются файлы")
                            .build()

            )),
            // FTPS Download
            Map.entry("FtpsDownloadTask", List.of(
                    ParamDefinition.builder()
                            .name("remoteDir")
                            .type("string")
                            .label("Удалённая директория")
                            .required(true)
                            .build()
            )),
            // FTPS Upload
            Map.entry("FtpsUploadTask", List.of(
                    ParamDefinition.builder()
                            .name("remoteDir")
                            .type("string")
                            .label("Удалённая директория")
                            .required(true)
                            .build()
            )),
            // FTPS Delete
            Map.entry("FtpsDeleteTask", List.of(
                    ParamDefinition.builder()
                            .name("sourceDir")
                            .type("string")
                            .label("sourceDir")
                            .placeholder("Каталог источника")
                            .required(true)
                            .description("Директория, из которой удаляются файлы")
                            .build()
            )),
            // MinIO Download
            Map.entry("MinioDownloadTask", List.of(
                    ParamDefinition.builder()
                            .name("remoteDir")
                            .type("string")
                            .label("Удалённая директория")
                            .required(true)
                            .build()
            )),
            // MinIO Upload
            Map.entry("MinioUploadTask", List.of(
                    ParamDefinition.builder()
                            .name("remoteDir")
                            .type("string")
                            .label("Удалённая директория")
                            .required(true)
                            .build()
            )),
            // MinIO Delete
            Map.entry("MinioDeleteTask", List.of(
                    ParamDefinition.builder()
                            .name("sourceDir")
                            .type("string")
                            .label("sourceDir")
                            .placeholder("Каталог источника")
                            .required(true)
                            .description("Директория, из которой удаляются файлы")
                            .build()
            ))
    );

    /**
     * Возвращает список определений параметров для заданного типа задачи.
     *
     * @param typeCode код типа задачи (например, "SftpDownloadTask")
     * @return список ParamDefinition
     * @throws ValidationException если тип неизвестен
     */
    public List<ParamDefinition> getTemplate(String typeCode) {
        if (!ALLOWED_TYPE_CODES.contains(typeCode)) {
            throw new ValidationException("Unsupported type code: " + typeCode);
        }
        List<ParamDefinition> template = TEMPLATES.get(typeCode);
        if (template == null) {
            // Теоретически не должно случиться, если ALLOWED_TYPE_CODES и TEMPLATES синхронизированы
            throw new ValidationException("Template not found for type: " + typeCode);
        }
        return template;
    }
}