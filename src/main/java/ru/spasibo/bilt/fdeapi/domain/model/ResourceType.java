package ru.spasibo.bilt.fdeapi.domain.model;

/**
 * Перечисление типов ресурсов, используемых в системе прав RBAC.
 * Ресурсы классифицируются по функциональной области приложения.
 */
public enum ResourceType {
    PAGE,
    BUTTON,
    TABLE,
    MENU,
    API,
    DATA,
    GLOBAL
}