package com.omotec.management.repository;

import com.omotec.management.model.KitRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface KitRequestRepository extends JpaRepository<KitRequest, Long> {

    List<KitRequest> findByTrainerName(String trainerName);

}
