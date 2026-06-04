package com.omotec.management.repository;

import com.omotec.management.model.ActivityComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ActivityComponentRepository extends JpaRepository<ActivityComponent, Long> {
    List<ActivityComponent> findByActivityId(Long activityId);
    List<ActivityComponent> findByComponentId(Long componentId);
}
