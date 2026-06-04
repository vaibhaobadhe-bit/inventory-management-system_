package com.omotec.management.repository;

import com.omotec.management.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByCourseId(Long courseId);
}