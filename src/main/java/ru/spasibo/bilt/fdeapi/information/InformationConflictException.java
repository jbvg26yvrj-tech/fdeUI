package ru.spasibo.bilt.fdeapi.information;
public class InformationConflictException extends RuntimeException {
    public InformationConflictException() { super("Информация изменена другим администратором. Загрузите актуальную версию перед сохранением."); }
}
