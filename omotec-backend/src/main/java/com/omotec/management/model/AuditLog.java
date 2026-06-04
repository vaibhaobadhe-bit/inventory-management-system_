package com.omotec.management.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String action;

    private String performedBy;

    private LocalDateTime timestamp;

    public AuditLog() {}

    public AuditLog(String action, String performedBy) {
        this.action = action;
        this.performedBy = performedBy;
        this.timestamp = LocalDateTime.now();
    }

    // getters and setters
    public Long getId() { return id; }
    public String getAction() { return action; }
    public String getPerformedBy() { return performedBy; }
    public LocalDateTime getTimestamp() { return timestamp; }

    public void setAction(String action) { this.action = action; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}