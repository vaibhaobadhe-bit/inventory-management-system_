package com.omotec.management.controller;

import com.omotec.management.model.AuditLog;
import com.omotec.management.repository.AuditLogRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditRepo;

    public AuditLogController(AuditLogRepository auditRepo) {
        this.auditRepo = auditRepo;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<AuditLog> getAll() {
        return auditRepo.findAll();
    }
}

