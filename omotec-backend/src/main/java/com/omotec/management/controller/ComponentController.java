package com.omotec.management.controller;

import com.omotec.management.model.Component;
import com.omotec.management.model.Activity;
import com.omotec.management.model.ActivityComponent;
import com.omotec.management.model.AuditLog;
import com.omotec.management.model.InventoryMovement;
import com.omotec.management.repository.ComponentRepository;
import com.omotec.management.repository.ActivityRepository;
import com.omotec.management.repository.ActivityComponentRepository;
import com.omotec.management.repository.AuditLogRepository;
import com.omotec.management.repository.InventoryMovementRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/components")
public class ComponentController {

    private final ComponentRepository componentRepo;
    private final ActivityRepository activityRepo;
    private final ActivityComponentRepository activityComponentRepo;
    private final InventoryMovementRepository movementRepo;
    private final AuditLogRepository auditRepo;

    public ComponentController(ComponentRepository componentRepo,
                               ActivityRepository activityRepo,
                               ActivityComponentRepository activityComponentRepo,
                               InventoryMovementRepository movementRepo,
                               AuditLogRepository auditRepo) {
        this.componentRepo = componentRepo;
        this.activityRepo = activityRepo;
        this.activityComponentRepo = activityComponentRepo;
        this.movementRepo = movementRepo;
        this.auditRepo = auditRepo;
    }

    // ===== Component CRUD =====

    @GetMapping
    @PreAuthorize("hasAnyRole('INVENTORY','MANAGER','TRAINER')")
    public List<Component> getAll() {
        return componentRepo.findAll().stream()
                .filter(Component::isActive)
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('INVENTORY')")
    public Component create(@RequestBody Component component) {
        if (component == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Component payload is required");
        }
        if (component.getComponentName() == null || component.getComponentName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Component name is required");
        }
        component.setCreatedAt(LocalDateTime.now());
        component.setIssuedStock(0);
        component.setActive(true);
        return componentRepo.save(component);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('INVENTORY')")
    public Component update(@PathVariable Long id, @RequestBody Component details) {
        Component existing = componentRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Component not found"));

        if (details == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Component payload is required");
        }
        if (details.getComponentName() == null || details.getComponentName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Component name is required");
        }

        existing.setComponentName(details.getComponentName());
        existing.setTotalStock(details.getTotalStock());
        existing.setLowStockThreshold(details.getLowStockThreshold());

        // Validate stock logic
        if (existing.getTotalStock() < existing.getIssuedStock()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Total stock cannot be less than already issued stock");
        }

        return componentRepo.save(existing);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('INVENTORY')")
    public void delete(@PathVariable Long id) {
        Component existing = componentRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Component not found"));

        existing.setActive(false);
        componentRepo.save(existing);
    }

    // ===== Manual Stock Adjustments =====

    @PostMapping("/manual-reduce")
    @PreAuthorize("hasRole('INVENTORY')")
    @Transactional
    public Component manualReduce(@RequestBody ManualAdjustmentDTO dto, Authentication auth) {
        if (dto == null || dto.getComponentId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Component ID is required");
        }
        if (dto.getQuantity() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
        }
        if (dto.getReason() == null || dto.getReason().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason is required");
        }
        if (dto.getEmployeeName() == null || dto.getEmployeeName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee/Trainer Name is required");
        }

        Component component = componentRepo.findById(dto.getComponentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Component not found"));

        int availableStock = component.getAvailableStock();
        if (dto.getQuantity() > availableStock) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient stock available");
        }

        int previousStock = availableStock;
        component.setTotalStock(component.getTotalStock() - dto.getQuantity());
        Component saved = componentRepo.save(component);

        // Log detailed inventory movement
        InventoryMovement movement = new InventoryMovement();
        movement.setComponent(saved);
        movement.setActivityName("Manual Reduction");
        movement.setMovementType("MANUAL_REDUCTION");
        movement.setQuantityChanged(dto.getQuantity());
        movement.setPreviousStock(previousStock);
        movement.setNewStock(saved.getAvailableStock());
        movement.setPerformedBy(auth.getName());
        movement.setEmployeeName(dto.getEmployeeName().trim());
        movement.setTimestamp(LocalDateTime.now());
        movement.setNotes("Manual stock reduction. Reason: " + dto.getReason().trim());
        movementRepo.save(movement);

        // Log audit log
        auditRepo.save(new AuditLog(
                "MANUAL_REDUCTION_Employee_" + dto.getEmployeeName().trim() + "_" + saved.getComponentName() + "_QTY_" + dto.getQuantity(),
                auth.getName()
        ));

        return saved;
    }

    @PostMapping("/manual-return")
    @PreAuthorize("hasRole('INVENTORY')")
    @Transactional
    public Component manualReturn(@RequestBody ManualAdjustmentDTO dto, Authentication auth) {
        if (dto == null || dto.getComponentId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Component ID is required");
        }
        if (dto.getQuantity() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
        }
        if (dto.getReason() == null || dto.getReason().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason is required");
        }
        if (dto.getEmployeeName() == null || dto.getEmployeeName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee/Trainer Name is required");
        }

        Component component = componentRepo.findById(dto.getComponentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Component not found"));

        int previousStock = component.getAvailableStock();
        component.setTotalStock(component.getTotalStock() + dto.getQuantity());
        Component saved = componentRepo.save(component);

        // Log detailed inventory movement
        InventoryMovement movement = new InventoryMovement();
        movement.setComponent(saved);
        movement.setActivityName("Manual Return");
        movement.setMovementType("MANUAL_RETURN");
        movement.setQuantityChanged(dto.getQuantity());
        movement.setPreviousStock(previousStock);
        movement.setNewStock(saved.getAvailableStock());
        movement.setPerformedBy(auth.getName());
        movement.setEmployeeName(dto.getEmployeeName().trim());
        movement.setTimestamp(LocalDateTime.now());
        movement.setNotes("Manual stock return. Reason: " + dto.getReason().trim());
        movementRepo.save(movement);

        // Log audit log
        auditRepo.save(new AuditLog(
                "MANUAL_RETURN_Employee_" + dto.getEmployeeName().trim() + "_" + saved.getComponentName() + "_QTY_" + dto.getQuantity(),
                auth.getName()
        ));

        return saved;
    }

    // ===== ActivityComponent Mappings =====

    @GetMapping("/mappings/activity/{activityId}")
    @PreAuthorize("hasAnyRole('INVENTORY','MANAGER','TRAINER')")
    public List<ActivityComponent> getMappingsByActivity(@PathVariable Long activityId) {
        return activityComponentRepo.findByActivityId(activityId);
    }

    @PostMapping("/mappings/bulk")
    @PreAuthorize("hasRole('INVENTORY')")
    @Transactional
    public List<ActivityComponent> bulkSaveMappings(
            @RequestParam Long activityId,
            @RequestBody List<MappingDTO> dtos) {

        Activity activity = activityRepo.findById(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Activity not found"));

        // Delete existing mappings
        List<ActivityComponent> existing = activityComponentRepo.findByActivityId(activityId);
        activityComponentRepo.deleteAll(existing);

        List<ActivityComponent> savedList = new ArrayList<>();
        if (dtos != null) {
            for (MappingDTO dto : dtos) {
                Component component = componentRepo.findById(dto.getComponentId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Component ID " + dto.getComponentId() + " not found"));

                ActivityComponent ac = new ActivityComponent();
                ac.setActivity(activity);
                ac.setComponent(component);
                ac.setQuantityRequired(dto.getQuantityRequired());
                savedList.add(activityComponentRepo.save(ac));
            }
        }
        return savedList;
    }

    // ===== Inventory Movement Logs =====

    @GetMapping("/movements")
    @PreAuthorize("hasAnyRole('INVENTORY','MANAGER')")
    public List<InventoryMovement> getMovements(@RequestParam(required = false) Long componentId) {
        if (componentId != null) {
            return movementRepo.findByComponentIdOrderByTimestampDesc(componentId);
        }
        return movementRepo.findAllByOrderByTimestampDesc();
    }

    // ===== DTOs =====

    public static class MappingDTO {
        private Long componentId;
        private int quantityRequired;

        public Long getComponentId() { return componentId; }
        public void setComponentId(Long componentId) { this.componentId = componentId; }

        public int getQuantityRequired() { return quantityRequired; }
        public void setQuantityRequired(int quantityRequired) { this.quantityRequired = quantityRequired; }
    }

    public static class ManualAdjustmentDTO {
        private Long componentId;
        private int quantity;
        private String reason;
        private String employeeName;

        public Long getComponentId() { return componentId; }
        public void setComponentId(Long componentId) { this.componentId = componentId; }

        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }

        public String getEmployeeName() { return employeeName; }
        public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }
    }
}
