package com.omotec.management.service;

import com.omotec.management.model.AuditLog;
import com.omotec.management.model.Kit;
import com.omotec.management.repository.AuditLogRepository;
import com.omotec.management.repository.KitRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class InventoryService {

    private final KitRepository kitRepository;
    private final AuditLogRepository auditRepository;

    public InventoryService(KitRepository kitRepository, AuditLogRepository auditRepository) {
        this.kitRepository = kitRepository;
        this.auditRepository = auditRepository;
    }

    // GET ALL KITS
    public List<Kit> getAllKits() {
        return kitRepository.findAll();
    }

    // ADD NEW KIT
    public Kit addKit(Kit kit) {
        validateKitPayload(kit);

        Kit saved = kitRepository.save(kit);

        auditRepository.save(new AuditLog(
                "INVENTORY_CREATED_ID_" + saved.getId(),
                null
        ));

        return saved;
    }

    // UPDATE KIT (ISSUE / EDIT)
    public Kit updateKit(Long id, Kit kitDetails) {
        if (kitDetails == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kit payload is required");
        }

        Kit kit = kitRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kit not found"));

        validateKitPayload(kitDetails);

        // update allowed fields
        kit.setName(kitDetails.getName());
        kit.setTotal(kitDetails.getTotal());
        kit.setIssued(kitDetails.getIssued());

        int available = kit.getTotal() - kit.getIssued();
        if (available < 0) {
            // should be impossible after validation, but keep production-safe guard
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Available stock cannot be negative");
        }

        Kit saved = kitRepository.save(kit);

        auditRepository.save(new AuditLog(
                "INVENTORY_UPDATED_ID_" + saved.getId() + "_AVAILABLE_" + available,
                null
        ));

        return saved;
    }

    // DELETE KIT (OPTIONAL)
    public void deleteKit(Long id) {
        if (!kitRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Kit not found");
        }

        kitRepository.deleteById(id);

        auditRepository.save(new AuditLog(
                "INVENTORY_DELETED_ID_" + id,
                null
        ));
    }

    private void validateKitPayload(Kit kit) {
        if (kit == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kit payload is required");
        }

        if (kit.getName() == null || kit.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kit name is required");
        }

        Integer total = kit.getTotal();
        Integer issued = kit.getIssued();

        if (total == null || issued == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "total and issued are required");
        }

        if (total < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "total cannot be negative");
        }
        if (issued < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "issued cannot be negative");
        }
        if (issued > total) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "issued cannot exceed total");
        }
    }
}

