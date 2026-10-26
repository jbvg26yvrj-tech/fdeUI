package ru.spasibo.bilt.fdeapi.ldap;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.unboundid.ldap.sdk.DN;
import com.unboundid.ldap.sdk.Filter;
import lombok.Getter;
import lombok.Setter;
import java.net.URI;
import java.util.Set;

/** A write-only password deliberately has no generated toString. */
@Getter @Setter
public class LdapSettings {
    private boolean enabled;
    private boolean syncEnabled;
    private String directoryType = "AD";
    private String url = "";
    private String tlsMode = "LDAPS";
    private String baseDn = "";
    private String bindDn = "";
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String bindPassword;
    private boolean bindPasswordConfigured;
    private String userFilter = "(objectClass=user)";
    private String activeFilter = "(objectClass=*)";
    private String loginAttribute = "sAMAccountName";
    private String idAttribute = "objectGUID";
    private String displayNameAttribute = "displayName";
    private String emailAttribute = "mail";
    private int syncIntervalMinutes = 15;
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 10000;

    public void validate() {
        try {
            if (!Set.of("AD", "LDAP").contains(directoryType) || !Set.of("LDAPS", "STARTTLS").contains(tlsMode))
                throw new IllegalArgumentException();
            if (syncIntervalMinutes < 1 || syncIntervalMinutes > 1440 || connectTimeoutMs < 500 || connectTimeoutMs > 10000
                    || readTimeoutMs < 500 || readTimeoutMs > 15000) throw new IllegalArgumentException();
            for (String attr : new String[]{loginAttribute, idAttribute, displayNameAttribute, emailAttribute})
                if (attr == null || !attr.matches("[A-Za-z][A-Za-z0-9-]{0,63}")) throw new IllegalArgumentException();
            Filter.create(userFilter.replace("{login}", "test"));
            Filter.create(activeFilter);
            if (!enabled && !syncEnabled && (url == null || url.isBlank())) return;
            URI uri = URI.create(url);
            if (uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                    || (uri.getPath() != null && !uri.getPath().isEmpty() && !uri.getPath().equals("/"))
                    || !(tlsMode.equals("LDAPS") ? "ldaps" : "ldap").equals(uri.getScheme())) throw new IllegalArgumentException();
            if (baseDn == null || baseDn.isBlank() || bindDn == null || bindDn.isBlank()) throw new IllegalArgumentException();
            new DN(baseDn); new DN(bindDn);
            if ("AD".equals(directoryType) && !"objectGUID".equalsIgnoreCase(idAttribute)) throw new IllegalArgumentException();
        } catch (Exception ex) {
            throw new IllegalArgumentException("Некорректные настройки LDAP: проверьте TLS, DN, фильтры, атрибуты и таймауты");
        }
    }
}
