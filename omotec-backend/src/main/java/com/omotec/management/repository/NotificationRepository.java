package com.omotec.management.repository;

import com.omotec.management.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUsernameAndRoleOrderByCreatedAtDesc(String username, String role);

    List<Notification> findByRoleOrderByCreatedAtDesc(String role);

    int countByUsernameAndRoleAndIsReadFalse(String username, String role);
}

