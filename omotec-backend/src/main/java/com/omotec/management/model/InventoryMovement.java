package com.omotec.management.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_movement")
public class InventoryMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "component_id")
    private Component component;

    private String activityName;
    private Long kitRequestId;

    // ISSUE, RETURN, ADJUSTMENT
    private String movementType;

    private int quantityChanged;
    private int previousStock;
    private int newStock;
    private String performedBy;
    private LocalDateTime timestamp;
    private String notes;
    private String employeeName;

    // ===== Getters / Setters =====
    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Component getComponent() { return component; }
    public void setComponent(Component component) { this.component = component; }

    public String getActivityName() { return activityName; }
    public void setActivityName(String activityName) { this.activityName = activityName; }

    public Long getKitRequestId() { return kitRequestId; }
    public void setKitRequestId(Long kitRequestId) { this.kitRequestId = kitRequestId; }

    public String getMovementType() { return movementType; }
    public void setMovementType(String movementType) { this.movementType = movementType; }

    public int getQuantityChanged() { return quantityChanged; }
    public void setQuantityChanged(int quantityChanged) { this.quantityChanged = quantityChanged; }

    public int getPreviousStock() { return previousStock; }
    public void setPreviousStock(int previousStock) { this.previousStock = previousStock; }

    public int getNewStock() { return newStock; }
    public void setNewStock(int newStock) { this.newStock = newStock; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
