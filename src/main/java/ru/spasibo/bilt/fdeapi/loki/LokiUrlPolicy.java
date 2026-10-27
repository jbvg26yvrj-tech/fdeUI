package ru.spasibo.bilt.fdeapi.loki;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.*;
import java.util.*;

@Component
public class LokiUrlPolicy {
    private final Set<String> allowed;
    public LokiUrlPolicy(@Value("${FDE_LOKI_ALLOWED_HOSTS:}") String hosts) {
        allowed=new HashSet<>();
        for(String value:hosts.split(",")) {
            String host=value.trim().toLowerCase(Locale.ROOT);
            if(!host.isEmpty()) allowed.add(host.contains(":") ? host : host+":443");
        }
    }
    static URI syntax(String value) {
        try {
            URI uri=URI.create(value);
            if(value.length()>2048 || !"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost()==null
                    || uri.getRawUserInfo()!=null || uri.getRawQuery()!=null || uri.getRawFragment()!=null
                    || uri.getPort()==0 || uri.getPort()>65535 || uri.getRawPath().contains("%")
                    || uri.getPath().contains("..") || uri.getPath().contains("\\")) throw new IllegalArgumentException();
            return uri;
        } catch(Exception e) { throw new IllegalArgumentException("Loki: требуется HTTPS URL без userinfo, query и fragment"); }
    }
    public URI validate(String value) {
        URI uri=syntax(value);
        String authority=uri.getHost().toLowerCase(Locale.ROOT)+":"+(uri.getPort()<0 ? 443 : uri.getPort());
        if(!allowed.contains(authority)) throw new IllegalArgumentException("Loki: адрес и порт отсутствуют в FDE_LOKI_ALLOWED_HOSTS");
        return uri;
    }
    static void checkAddress(InetAddress address) {
        byte[] bytes=address.getAddress();
        // Block metadata/link-local, loopback, unspecified and multicast even when a host is allowed.
        // Private corporate ranges are permitted only via an explicitly allowlisted hostname/port.
        if(address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isMulticastAddress() || address.getHostAddress().equals("100.100.100.200")
                || address.getHostAddress().equals("168.63.129.16")
                || address.getHostAddress().equals("fd00:ec2:0:0:0:0:0:254")
                || (bytes.length==4 && ((bytes[0]&255)==0 || (bytes[0]&255)>=224))
                || (bytes.length==16 && (bytes[0]&0xe0)!=0x20 && (bytes[0]&0xfe)!=0xfc)
                || (bytes.length==16 && (bytes[0]&255)==0 && (bytes[1]&255)==0))
            throw new IllegalArgumentException("Loki: сетевой адрес запрещён");
    }
}
