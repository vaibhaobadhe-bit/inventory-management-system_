package com.omotec.management.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Let Spring Security handle AccessDeniedException properly (403 Forbidden)
    @ExceptionHandler(AccessDeniedException.class)
    public void handleAccessDenied(AccessDeniedException ex) throws AccessDeniedException {
        throw ex;
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntime(RuntimeException ex) {
        System.err.println("=== RUNTIME EXCEPTION: " + ex.getMessage() + " ===");
        ex.printStackTrace();
        return ResponseEntity
                .badRequest()
                .body(ex.getMessage());
    }

}