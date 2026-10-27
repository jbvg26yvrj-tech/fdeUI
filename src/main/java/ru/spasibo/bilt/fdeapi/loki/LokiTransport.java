package ru.spasibo.bilt.fdeapi.loki;

import io.netty.channel.ChannelOption;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.channel.ChannelHandlerContext;
import io.netty.handler.codec.DecoderResult;
import io.netty.handler.codec.http.HttpObject;
import io.netty.handler.ssl.SslHandshakeCompletionEvent;
import reactor.netty.NettyPipeline;
import io.netty.channel.socket.nio.NioDatagramChannel;
import io.netty.resolver.*;
import io.netty.resolver.dns.*;
import io.netty.util.concurrent.*;
import jakarta.annotation.PreDestroy;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import java.net.*;
import java.time.Duration;
import java.util.*;

@Component
public class LokiTransport {
    static final int MAX_BODY=2*1024*1024;
    private final AddressResolverGroup<InetSocketAddress> dns = new DnsAddressResolverGroup(
            NioDatagramChannel.class, DnsServerAddressStreamProviders.platformDefault());
    private final AddressResolverGroup<InetSocketAddress> guarded=new AddressResolverGroup<>() {
        @Override protected AddressResolver<InetSocketAddress> newResolver(EventExecutor executor) {
            AddressResolver<InetSocketAddress> delegate=dns.getResolver(executor);
            return new AbstractAddressResolver<InetSocketAddress>(executor, InetSocketAddress.class) {
                @Override protected boolean doIsResolved(InetSocketAddress address) { return false; }
                private List<InetSocketAddress> check(List<InetSocketAddress> addresses) {
                    for(var a:addresses) LokiUrlPolicy.checkAddress(a.getAddress());
                    return addresses;
                }
                @Override protected void doResolve(InetSocketAddress address, Promise<InetSocketAddress> promise) {
                    delegate.resolveAll(address).addListener((Future<List<InetSocketAddress>> result)->{
                        if(!result.isSuccess()) { promise.setFailure(result.cause()); return; }
                        try { promise.setSuccess(check(result.getNow()).get(0)); }
                        catch(Exception e) { promise.setFailure(e); }
                    });
                }
                @Override protected void doResolveAll(InetSocketAddress address, Promise<List<InetSocketAddress>> promise) {
                    delegate.resolveAll(address).addListener((Future<List<InetSocketAddress>> result)->{
                        if(!result.isSuccess()) { promise.setFailure(result.cause()); return; }
                        try { promise.setSuccess(check(result.getNow())); }
                        catch(Exception e) { promise.setFailure(e); }
                    });
                }
            };
        }
    };
    public byte[] get(URI uri, Map<String,String> headers, int seconds) {
        // Resolver returns vetted IP sockets directly; no second hostname lookup at connect time.
        return request(HttpClient.newConnection().resolver(guarded),uri,headers,seconds);
    }
    static byte[] request(HttpClient client, URI uri, Map<String,String> headers, int seconds) {
        try {
            var http=client.followRedirect(false).compress(false)
                    .doOnChannelInit((observer,channel,address)->channel.pipeline()
                            .addBefore(NettyPipeline.ReactiveBridge,"lokiSafeTransportErrors",new SafeTransportErrors()))
                    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS,seconds*1000)
                    .responseTimeout(Duration.ofSeconds(seconds));
            return WebClient.builder().clientConnector(new ReactorClientHttpConnector(http))
                    .codecs(c->c.defaultCodecs().maxInMemorySize(MAX_BODY)).build().get().uri(uri)
                    .headers(h->headers.forEach(h::set)).exchangeToMono(response->{
                        int code=response.statusCode().value();
                        if(code!=200) return response.releaseBody().then(reactor.core.publisher.Mono.error(
                                new LokiFailure(code==401 || code==403 ? "Loki: отказ в авторизации или tenant" : "Loki: источник вернул ошибку")));
                        long length=response.headers().contentLength().orElse(-1);
                        if(length>MAX_BODY) return response.releaseBody().then(reactor.core.publisher.Mono.error(new LokiFailure("Loki: превышен предел ответа; сузьте период")));
                        return response.bodyToMono(byte[].class);
                    }).block(Duration.ofSeconds(seconds));
        } catch(LokiFailure e) { throw e; }
        catch(Exception e) { throw new LokiFailure("Loki: запрос не выполнен (TLS, сеть, таймаут или предел ответа)"); }
    }
    /** Netty TLS/HTTP decoder errors can embed upstream bytes; remove those before Reactor logs them. */
    static final class SafeTransportErrors extends ChannelInboundHandlerAdapter {
        private java.io.IOException safe() { return new java.io.IOException("Loki transport failed"); }
        @Override public void exceptionCaught(ChannelHandlerContext context,Throwable cause) {
            context.fireExceptionCaught(safe());
        }
        @Override public void userEventTriggered(ChannelHandlerContext context,Object event) {
            if(event instanceof SslHandshakeCompletionEvent handshake && !handshake.isSuccess())
                event=new SslHandshakeCompletionEvent(safe());
            context.fireUserEventTriggered(event);
        }
        @Override public void channelRead(ChannelHandlerContext context,Object message) {
            if(message instanceof HttpObject object && object.decoderResult().isFailure())
                object.setDecoderResult(DecoderResult.failure(safe()));
            context.fireChannelRead(message);
        }
    }
    @PreDestroy void close() { guarded.close(); dns.close(); }
    public static final class LokiFailure extends RuntimeException {
        public LokiFailure(String safeMessage) { super(safeMessage); }
    }
}
