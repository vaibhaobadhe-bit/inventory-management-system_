package com.omotec.management.repository;

import com.omotec.management.model.Kit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KitRepository extends JpaRepository<Kit, Long> {
    
}
