package ru.spasibo.bilt.fdeapi.ldap;

public record DirectoryIdentity(String externalId, String login, String displayName, String email, boolean active) {}
