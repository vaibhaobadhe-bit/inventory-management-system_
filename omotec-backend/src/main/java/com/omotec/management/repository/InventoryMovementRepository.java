package com.omotec.management.repository;

import com.omotec.management.model.InventoryMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, Long> {
    List<InventoryMovement> findByComponentIdOrderByTimestampDesc(Long componentId);
    List<InventoryMovement> findByKitRequestId(Long kitRequestId);
    List<InventoryMovement> findAllByOrderByTimestampDesc();
}
