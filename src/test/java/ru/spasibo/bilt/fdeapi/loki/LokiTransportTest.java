package ru.spasibo.bilt.fdeapi.loki;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import reactor.netty.http.client.HttpClient;
import java.net.*;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;

class LokiTransportTest {
    @Test void controlledHttpServerCoversSuccessAuthRedirectAndBodyBound() throws Exception {
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/ok",e->{ byte[] body="{}".getBytes(); e.sendResponseHeaders(200,body.length); e.getResponseBody().write(body); e.close(); });
        server.createContext("/denied",e->{byte[] body="UPSTREAM_SECRET".getBytes(); e.sendResponseHeaders(401,body.length); e.getResponseBody().write(body); e.close();});
        server.createContext("/redirect",e->{e.getResponseHeaders().add("Location","/ok");e.sendResponseHeaders(302,-1);e.close();});
        server.createContext("/large",e->{e.sendResponseHeaders(200,LokiTransport.MAX_BODY+1);e.close();});
        server.createContext("/slow",e->{e.sendResponseHeaders(200,5); try { Thread.sleep(2000); } catch(InterruptedException ignored) { Thread.currentThread().interrupt(); } e.close();});
        server.start();
        try {
            String base="http://127.0.0.1:"+server.getAddress().getPort();
            assertThat(LokiTransport.request(HttpClient.newConnection(),URI.create(base+"/ok"),Map.of(),2)).isEqualTo("{}".getBytes());
            for(String path:new String[]{"/denied","/redirect","/large"})
                assertThatThrownBy(()->LokiTransport.request(HttpClient.newConnection(),URI.create(base+path),Map.of(),2))
                        .isInstanceOf(LokiTransport.LokiFailure.class).hasMessageNotContaining("UPSTREAM_SECRET");
        assertThatThrownBy(()->LokiTransport.request(HttpClient.newConnection(),URI.create(base+"/slow"),Map.of(),1))
                    .isInstanceOf(LokiTransport.LokiFailure.class);
            assertThatThrownBy(()->LokiTransport.request(HttpClient.newConnection(),URI.create(base.replace("http:","https:")+"/ok"),Map.of(),1))
                    .isInstanceOf(LokiTransport.LokiFailure.class);
        } finally { server.stop(0); }
    }
    @Test void invalidTlsDoesNotLogUpstreamBytes() throws Exception {
        var logger=(ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
        var logs=new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>(); logs.list = new java.util.concurrent.CopyOnWriteArrayList<>(); logs.start(); logger.addAppender(logs);
        try(var server=new java.net.ServerSocket(0,1,InetAddress.getByName("127.0.0.1"))) {
            var reply=java.util.concurrent.CompletableFuture.runAsync(()->{
                try(var socket=server.accept()) {
                    socket.getInputStream().read(new byte[4096]);
                    socket.getOutputStream().write("HTTP/1.1 400 UPSTREAM_CREDENTIAL\r\nContent-Length: 0\r\n\r\n".getBytes());
                } catch(java.io.IOException e) { throw new RuntimeException(e); }
            });
            assertThatThrownBy(()->LokiTransport.request(HttpClient.newConnection(),URI.create("https://127.0.0.1:"+server.getLocalPort()),Map.of(),2))
                    .isInstanceOf(LokiTransport.LokiFailure.class);
            reply.get(3,java.util.concurrent.TimeUnit.SECONDS);
            String logged=logs.list.stream().map(e->e.getFormattedMessage()+
                    (e.getThrowableProxy()==null ? "" : ch.qos.logback.classic.spi.ThrowableProxyUtil.asString(e.getThrowableProxy())))
                    .collect(java.util.stream.Collectors.joining());
            assertThat(logged).doesNotContain("UPSTREAM_CREDENTIAL", "555053545245414d5f43524544454e5449414c");
        } finally { logger.detachAppender(logs); logs.stop(); }
    }
    @Test void productionResolverRejectsLoopbackBeforeAnyConnection() throws Exception {
        var transport=new LokiTransport();
        try(var server=new java.net.ServerSocket(0,1,InetAddress.getByName("127.0.0.1"))) {
            server.setSoTimeout(100);
            for(String host:new String[]{"127.0.0.1","localhost"}) {
                assertThatThrownBy(()->transport.get(URI.create("https://"+host+":"+server.getLocalPort()),Map.of(),1))
                        .isInstanceOf(LokiTransport.LokiFailure.class);
                assertThatThrownBy(server::accept).isInstanceOf(java.net.SocketTimeoutException.class);
            }
        } finally { transport.close(); }
    }
}
