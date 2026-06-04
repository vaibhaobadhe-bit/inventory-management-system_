package com.omotec.management.service;

import com.omotec.management.model.AuditLog;
import com.omotec.management.model.Kit;
import com.omotec.management.model.KitRequest;
import com.omotec.management.model.Notification;
import com.omotec.management.model.Activity;
import com.omotec.management.model.ActivityComponent;
import com.omotec.management.model.Component;
import com.omotec.management.model.InventoryMovement;
import com.omotec.management.repository.AuditLogRepository;
import com.omotec.management.repository.KitRepository;
import com.omotec.management.repository.KitRequestRepository;
import com.omotec.management.repository.NotificationRepository;
import com.omotec.management.repository.ComponentRepository;
import com.omotec.management.repository.ActivityComponentRepository;
import com.omotec.management.repository.InventoryMovementRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class KitRequestService {

    private final KitRequestRepository repo;
    private final KitRepository kitRepo;
    private final AuditLogRepository auditRepo;
    private final NotificationRepository notificationRepo;
    private final ComponentRepository componentRepo;
    private final ActivityComponentRepository activityComponentRepo;
    private final InventoryMovementRepository movementRepo;

    public KitRequestService(KitRequestRepository repo,
                              KitRepository kitRepo,
                              AuditLogRepository auditRepo,
                              NotificationRepository notificationRepo,
                              ComponentRepository componentRepo,
                              ActivityComponentRepository activityComponentRepo,
                              InventoryMovementRepository movementRepo) {
        this.repo = repo;
        this.kitRepo = kitRepo;
        this.auditRepo = auditRepo;
        this.notificationRepo = notificationRepo;
        this.componentRepo = componentRepo;
        this.activityComponentRepo = activityComponentRepo;
        this.movementRepo = movementRepo;
    }

    public List<KitRequest> getAll() {
        return repo.findAll();
    }

    @Transactional
    public KitRequest create(KitRequest r, Authentication auth) {
        r.setStatus("PENDING");
        r.setTrainerName(auth.getName());

        KitRequest saved = repo.save(r);

        auditRepo.save(new AuditLog(
                "REQUEST_CREATED_ID_" + saved.getId(),
                auth.getName()
        ));

        notificationRepo.save(new Notification(
                "New Kit Request (ID: " + saved.getId() + ")",
                "INVENTORY",
                auth.getName(),
                false,
                java.time.LocalDateTime.now()
        ));

        return saved;
    }

    @Transactional
    public KitRequest updateStatus(Long id, String action, Authentication auth) {
        KitRequest req = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Kit Request with ID " + id + " not found"));

        switch (action) {
            case "approve":
                req.setStatus("APPROVED");
                if (req.getTrainerName() != null) {
                    notificationRepo.save(new Notification(
                             "Request Approved (ID: " + id + ")",
                             "TRAINER",
                             req.getTrainerName(),
                             false,
                             java.time.LocalDateTime.now()
                    ));
                }
                break;

            case "reject":
                req.setStatus("REJECTED");
                if (req.getTrainerName() != null) {
                    notificationRepo.save(new Notification(
                             "Request Rejected (ID: " + id + ")",
                             "TRAINER",
                             req.getTrainerName(),
                             false,
                             java.time.LocalDateTime.now()
                    ));
                }
                break;

            case "issue":
                if (!"APPROVED".equals(req.getStatus())) {
                    throw new RuntimeException("Request must be approved first");
                }

                if (req.getCourse() == null || req.getCourse().getId() == null) {
                    throw new RuntimeException("Request does not have a linked course");
                }

                Kit kitToIssue = kitRepo.findById(req.getCourse().getId())
                        .orElseGet(() -> {
                            Kit newKit = new Kit();
                            newKit.setId(req.getCourse().getId());
                            newKit.setName(req.getCourseName() != null ? req.getCourseName() : (req.getCourse() != null ? req.getCourse().getCourseName() : "Unknown Kit"));
                            newKit.setTotal(req.getQuantity() + 100);
                            newKit.setIssued(0);
                            return kitRepo.save(newKit);
                        });

                if (req.getTrainerName() != null) {
                    notificationRepo.save(new Notification(
                             "Kit Issued (ID: " + id + ")",
                             "TRAINER",
                             req.getTrainerName(),
                             false,
                             java.time.LocalDateTime.now()
                    ));
                }

                int available = kitToIssue.getTotal() - kitToIssue.getIssued();
                if (req.getQuantity() > available) {
                    throw new RuntimeException("Not enough stock available");
                }

                // Deduct component stock before updating status
                deductComponentStock(req, auth.getName());

                kitToIssue.setIssued(
                        kitToIssue.getIssued() + req.getQuantity()
                );

                kitRepo.save(kitToIssue);

                req.setStatus("ISSUED");
                break;

            case "confirmReturn":
                if (!"ISSUED".equals(req.getStatus())) {
                    throw new RuntimeException("Return not allowed for this status");
                }

                if (req.getCourse() == null || req.getCourse().getId() == null) {
                    throw new RuntimeException("Request does not have a linked course");
                }

                Kit kitToReturn = kitRepo.findById(req.getCourse().getId())
                        .orElseGet(() -> {
                            Kit newKit = new Kit();
                            newKit.setId(req.getCourse().getId());
                            newKit.setName(req.getCourseName() != null ? req.getCourseName() : (req.getCourse() != null ? req.getCourse().getCourseName() : "Unknown Kit"));
                            newKit.setTotal(req.getQuantity() + 100);
                            newKit.setIssued(req.getQuantity());
                            return kitRepo.save(newKit);
                        });

                int newIssued = kitToReturn.getIssued() - req.getQuantity();

                if (newIssued < 0) {
                    throw new RuntimeException("Stock inconsistency detected");
                }

                // Return component stock before updating status
                returnComponentStock(req, auth.getName());

                kitToReturn.setIssued(newIssued);
                kitRepo.save(kitToReturn);

                req.setStatus("RETURNED");
                break;

            default:
                throw new RuntimeException("Invalid action");
        }

        KitRequest updated = repo.save(req);

        String auditActionText = "REQUEST_" + action.toUpperCase() + "_ID_" + id;
        if ("issue".equals(action)) {
            Activity activity = req.getActivity();
            if (activity != null) {
                StringBuilder sb = new StringBuilder();
                sb.append("Issued Activity: ").append(activity.getActivityName()).append("\n\n");
                List<ActivityComponent> requiredComponents = activityComponentRepo.findByActivityId(activity.getId());
                for (ActivityComponent ac : requiredComponents) {
                    int totalNeeded = req.getQuantity() * ac.getQuantityRequired();
                    sb.append(ac.getComponent().getComponentName()).append(" -").append(totalNeeded).append("\n");
                }
                auditActionText = sb.toString().trim();
            }
        }

        auditRepo.save(new AuditLog(
                auditActionText,
                auth.getName()
        ));

        return updated;
    }

    @Transactional
    public KitRequest requestReturn(Long id, Authentication auth) {
        KitRequest req = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Kit Request with ID " + id + " not found"));

        if (!"ISSUED".equals(req.getStatus())) {
            throw new RuntimeException("Only issued kits can be returned");
        }

        // Return component stock before updating status
        returnComponentStock(req, auth.getName());

        req.setStatus("RETURNED");

        KitRequest updated = repo.save(req);

        auditRepo.save(new AuditLog(
                "RETURN_REQUESTED_ID_" + id,
                auth.getName()
        ));

        return updated;
    }

    @Transactional
    public void delete(Long id, Authentication auth) {
        repo.deleteById(id);

        auditRepo.save(new AuditLog(
                "DELETED_REQUEST_ID_" + id,
                auth.getName()
        ));
    }

    public List<KitRequest> getMyRequests(Authentication auth) {
        String username = auth.getName();
        return repo.findByTrainerName(username);
    }

    private void deductComponentStock(KitRequest req, String username) {
        Activity activity = req.getActivity();
        if (activity != null) {
            List<ActivityComponent> requiredComponents = activityComponentRepo.findByActivityId(activity.getId());
            // 1. Validation phase
            for (ActivityComponent ac : requiredComponents) {
                if (ac.getComponent() == null || ac.getComponent().getId() == null) {
                    throw new RuntimeException("Activity component mapping is incomplete");
                }
                Component component = componentRepo.findById(ac.getComponent().getId())
                        .orElseThrow(() -> new RuntimeException("Component " + ac.getComponent().getComponentName() + " not found"));
                int totalNeeded = req.getQuantity() * ac.getQuantityRequired();
                if (component.getAvailableStock() < totalNeeded) {
                    throw new RuntimeException("Insufficient component stock");
                }
            }
            // 2. Deduction & Logging phase
            for (ActivityComponent ac : requiredComponents) {
                Component component = componentRepo.findById(ac.getComponent().getId())
                        .orElseThrow(() -> new RuntimeException("Component not found for issue"));
                int totalNeeded = req.getQuantity() * ac.getQuantityRequired();
                int prevStock = component.getAvailableStock();

                component.setIssuedStock(component.getIssuedStock() + totalNeeded);
                Component savedComp = componentRepo.save(component);

                InventoryMovement movement = new InventoryMovement();
                movement.setComponent(savedComp);
                movement.setActivityName(activity.getActivityName());
                movement.setKitRequestId(req.getId());
                movement.setMovementType("ISSUE");
                movement.setQuantityChanged(totalNeeded);
                movement.setPreviousStock(prevStock);
                movement.setNewStock(savedComp.getAvailableStock());
                movement.setPerformedBy(username);
                movement.setEmployeeName(req.getTrainerName()); // trainer who received the kit
                movement.setTimestamp(java.time.LocalDateTime.now());
                movement.setNotes("Issued via Kit Request ID: " + req.getId());
                movementRepo.save(movement);
            }
        }
    }

    private void returnComponentStock(KitRequest req, String username) {
        Activity activity = req.getActivity();
        if (activity != null) {
            List<ActivityComponent> requiredComponents = activityComponentRepo.findByActivityId(activity.getId());
            for (ActivityComponent ac : requiredComponents) {
                if (ac.getComponent() == null || ac.getComponent().getId() == null) {
                    throw new RuntimeException("Activity component mapping is incomplete for return");
                }
                Component component = componentRepo.findById(ac.getComponent().getId())
                        .orElseThrow(() -> new RuntimeException("Component " + ac.getComponent().getComponentName() + " not found"));
                int totalToReturn = req.getQuantity() * ac.getQuantityRequired();
                int prevStock = component.getAvailableStock();

                int calculatedIssued = component.getIssuedStock() - totalToReturn;
                component.setIssuedStock(calculatedIssued < 0 ? 0 : calculatedIssued);
                Component savedComp = componentRepo.save(component);

                InventoryMovement movement = new InventoryMovement();
                movement.setComponent(savedComp);
                movement.setActivityName(activity.getActivityName());
                movement.setKitRequestId(req.getId());
                movement.setMovementType("RETURN");
                movement.setQuantityChanged(totalToReturn);
                movement.setPreviousStock(prevStock);
                movement.setNewStock(savedComp.getAvailableStock());
                movement.setPerformedBy(username);
                movement.setEmployeeName(req.getTrainerName()); // trainer who returned the kit
                movement.setTimestamp(java.time.LocalDateTime.now());
                movement.setNotes("Returned via Kit Request ID: " + req.getId());
                movementRepo.save(movement);
            }
        }
    }
}
