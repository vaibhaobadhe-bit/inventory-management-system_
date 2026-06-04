package com.omotec.management.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Component {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String componentName;
    private int totalStock;
    private int issuedStock;
    private int lowStockThreshold;
    private LocalDateTime createdAt;

    // Jackson alias so frontend can use "name"
    @com.fasterxml.jackson.annotation.JsonProperty("name")
    public String getName() {
        return componentName;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("name")
    public void setName(String name) {
        this.componentName = name;
    }

    // Computed available stock (read-only in JSON)
    @com.fasterxml.jackson.annotation.JsonProperty("availableStock")
    public int getAvailableStock() {
        return totalStock - issuedStock;
    }

    // Computed low stock flag (read-only in JSON)
    @com.fasterxml.jackson.annotation.JsonProperty("lowStock")
    public boolean isLowStock() {
        return getAvailableStock() <= lowStockThreshold;
    }

    private boolean active = true;

    // ===== Getters / Setters =====
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getComponentName() { return componentName; }
    public void setComponentName(String componentName) { this.componentName = componentName; }

    public int getTotalStock() { return totalStock; }
    public void setTotalStock(int totalStock) { this.totalStock = totalStock; }

    public int getIssuedStock() { return issuedStock; }
    public void setIssuedStock(int issuedStock) { this.issuedStock = issuedStock; }

    public int getLowStockThreshold() { return lowStockThreshold; }
    public void setLowStockThreshold(int lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
