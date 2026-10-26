package ru.spasibo.bilt.fdeapi.ldap;

/** Never carries an SDK exception, directory diagnostic, DN, or credential into logs/responses. */
public class DirectoryException extends RuntimeException {
    public DirectoryException() { super("Не удалось проверить каталог LDAP. Проверьте подключение и учётные данные"); }
}
