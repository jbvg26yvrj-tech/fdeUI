package ru.spasibo.bilt.fdeapi.domain.model;

import java.util.Map;
import java.util.Set;

/**
 * Описывает разрешённые и обязательные пользовательские свойства для каждого типа задачи.
 * <p>
 * Системные свойства (credentials.*, sessionId, files, callbackUrl) никогда не допускаются
 * в пользовательских свойствах задачи и валидируются отдельно.
 */
public final class TaskPropsDefinition {

    private TaskPropsDefinition() {
        // служебный класс (utility)
    }

    /**
     * Префиксы и ключи, управляемые системой, которые не должны присутствовать в пользовательских свойствах.
     */
    public static final Set<String> SYSTEM_PROP_PREFIXES = Set.of("credentials.");
    public static final Set<String> SYSTEM_PROP_KEYS = Set.of("sessionId", "files", "callbackUrl");

    /**
     * Допустимые значения для перечисляемых свойств.
     */
    public static final Set<String> ALLOWED_MASK_TYPES = Set.of("GLOB", "REGEX");
    public static final Set<String> ALLOWED_BOOLEAN_VALUES = Set.of("true", "false");

    // --- Задачи скачивания ---

    private static final Set<String> SFTP_FTPS_SMB_DOWNLOAD_REQUIRED = Set.of("sourceDir");
    private static final Set<String> SFTP_FTPS_SMB_DOWNLOAD_OPTIONAL = Set.of(
            "fileMask", "maskType", "recursive", "preserveStructure"
    );

    private static final Set<String> MINIO_DOWNLOAD_REQUIRED = Set.of("sourceDir");
    private static final Set<String> MINIO_DOWNLOAD_OPTIONAL = Set.of("fileMask", "maskType");

    // --- Задачи загрузки ---

    private static final Set<String> UPLOAD_REQUIRED = Set.of("targetDir");
    private static final Set<String> UPLOAD_OPTIONAL = Set.of();

    // --- Задачи удаления ---

    private static final Set<String> DELETE_REQUIRED = Set.of("sourceDir");
    private static final Set<String> DELETE_OPTIONAL = Set.of();

    /**
     * Обязательные свойства по типу задачи.
     */
    public static final Map<String, Set<String>> REQUIRED_PROPS = Map.ofEntries(
            Map.entry("SftpDownloadTask", SFTP_FTPS_SMB_DOWNLOAD_REQUIRED),
            Map.entry("FtpsDownloadTask", SFTP_FTPS_SMB_DOWNLOAD_REQUIRED),
            Map.entry("SmbDownloadTask", SFTP_FTPS_SMB_DOWNLOAD_REQUIRED),
            Map.entry("MinioDownloadTask", MINIO_DOWNLOAD_REQUIRED),
            Map.entry("SftpUploadTask", UPLOAD_REQUIRED),
            Map.entry("FtpsUploadTask", UPLOAD_REQUIRED),
            Map.entry("SmbUploadTask", UPLOAD_REQUIRED),
            Map.entry("MinioUploadTask", UPLOAD_REQUIRED),
            Map.entry("SftpDeleteTask", DELETE_REQUIRED),
            Map.entry("FtpsDeleteTask", DELETE_REQUIRED),
            Map.entry("SmbDeleteTask", DELETE_REQUIRED),
            Map.entry("MinioDeleteTask", DELETE_REQUIRED)
    );

    /**
     * Необязательные свойства по типу задачи.
     */
    public static final Map<String, Set<String>> OPTIONAL_PROPS = Map.ofEntries(
            Map.entry("SftpDownloadTask", SFTP_FTPS_SMB_DOWNLOAD_OPTIONAL),
            Map.entry("FtpsDownloadTask", SFTP_FTPS_SMB_DOWNLOAD_OPTIONAL),
            Map.entry("SmbDownloadTask", SFTP_FTPS_SMB_DOWNLOAD_OPTIONAL),
            Map.entry("MinioDownloadTask", MINIO_DOWNLOAD_OPTIONAL),
            Map.entry("SftpUploadTask", UPLOAD_OPTIONAL),
            Map.entry("FtpsUploadTask", UPLOAD_OPTIONAL),
            Map.entry("SmbUploadTask", UPLOAD_OPTIONAL),
            Map.entry("MinioUploadTask", UPLOAD_OPTIONAL),
            Map.entry("SftpDeleteTask", DELETE_OPTIONAL),
            Map.entry("FtpsDeleteTask", DELETE_OPTIONAL),
            Map.entry("SmbDeleteTask", DELETE_OPTIONAL),
            Map.entry("MinioDeleteTask", DELETE_OPTIONAL)
    );

    /**
     * Возвращает полный набор разрешённых ключей свойств (обязательные + необязательные) для указанного типа задачи.
     *
     * @param typeCode код типа задачи
     * @return набор разрешённых ключей свойств или пустой набор, если тип неизвестен
     */
    public static Set<String> getAllowedProps(String typeCode) {
        Set<String> required = REQUIRED_PROPS.getOrDefault(typeCode, Set.of());
        Set<String> optional = OPTIONAL_PROPS.getOrDefault(typeCode, Set.of());
        if (required.isEmpty() && optional.isEmpty()) {
            return Set.of();
        }
        var result = new java.util.HashSet<>(required);
        result.addAll(optional);
        return Set.copyOf(result);
    }
}
