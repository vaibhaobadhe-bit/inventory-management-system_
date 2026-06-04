package com.omotec.management.controller;

import com.omotec.management.model.AuditLog;
import com.omotec.management.repository.AuditLogRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ActivityFeedController {

    private final AuditLogRepository auditLogRepo;

    public ActivityFeedController(AuditLogRepository auditLogRepo) {
        this.auditLogRepo = auditLogRepo;
    }

    /**
     * Normalized activity feed.
     * Current implementation uses existing AuditLog entries.
     */
    @GetMapping("/activity-feed")
    @PreAuthorize("isAuthenticated()")
    public List<ActivityFeedItem> activityFeed() {
        List<AuditLog> logs = auditLogRepo.findAll();

        // Latest first; limit to keep payload small
        return logs.stream()
                .sorted(Comparator.comparing(AuditLog::getTimestamp).reversed())
                .limit(50)
                .map(this::toFeedItem)
                .toList();
    }

    private ActivityFeedItem toFeedItem(AuditLog log) {
        String action = log.getAction();
        String module = inferModule(action);
        String status = inferStatus(action);

        return new ActivityFeedItem(
                action,
                log.getPerformedBy(),
                null, // role not reliably available from current AuditLog
                log.getTimestamp(),
                module,
                status
        );
    }

    private String inferModule(String action) {
        if (action == null) return "SYSTEM";

        String a = action.toUpperCase();
        if (a.contains("REQUEST")) return "KIT_REQUEST";
        if (a.contains("RETURN")) return "KIT_REQUEST";
        if (a.contains("INVENTORY")) return "INVENTORY";
        if (a.contains("ISSUE")) return "ISSUES";
        if (a.contains("USER")) return "USERS";
        return "SYSTEM";
    }

    private String inferStatus(String action) {
        if (action == null) return "UPDATED";

        String a = action.toUpperCase();
        if (a.contains("APPROVE")) return "APPROVED";
        if (a.contains("REJECT")) return "REJECTED";
        if (a.contains("ISSUED")) return "ISSUED";
        if (a.contains("RETURNED")) return "RETURNED";
        if (a.contains("PENDING")) return "PENDING";
        if (a.contains("RESOLVED")) return "RESOLVED";
        if (a.contains("DELETED")) return "DELETED";
        return "UPDATED";
    }

    public record ActivityFeedItem(
            String action,
            String username,
            String role,
            java.time.LocalDateTime timestamp,
            String module,
            String status
    ) {
    }
}

