package ru.spasibo.bilt.fdeapi.loki;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestControllerAdvice(assignableTypes={LokiController.class,LokiSettingsController.class})
public class LokiExceptionHandler {
    @ExceptionHandler(LokiTransport.LokiFailure.class)
    ResponseEntity<Map<String,String>> unavailable(LokiTransport.LokiFailure error) {
        return ResponseEntity.status(502).body(Map.of("message",error.getMessage()));
    }
    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<Map<String,String>> configuration(IllegalStateException error) {
        return ResponseEntity.status(503).body(Map.of("message","Loki: проверьте конфигурацию подключения и ключ шифрования"));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String,String>> invalid(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("message",error.getMessage()));
    }
}
