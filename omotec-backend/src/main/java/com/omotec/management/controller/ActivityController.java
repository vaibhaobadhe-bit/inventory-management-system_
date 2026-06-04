package com.omotec.management.controller;

import com.omotec.management.model.Activity;
import com.omotec.management.model.Course;
import com.omotec.management.repository.ActivityRepository;
import com.omotec.management.repository.CourseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;


import java.util.List;

@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    private final ActivityRepository repo;
    private final CourseRepository courseRepo;

    public ActivityController(ActivityRepository repo, CourseRepository courseRepo) {
        this.repo = repo;
        this.courseRepo = courseRepo;
    }


    // Master data list (required by ERP dropdowns)
    @GetMapping
    public List<Activity> getAll() {
        return repo.findAll();
    }

    // Existing endpoint (keep for compatibility)
    @GetMapping("/course/{courseId}")
    public List<Activity> getByCourse(@PathVariable Long courseId) {
        return repo.findByCourseId(courseId);
    }

    // Required alias endpoint
    @GetMapping("/by-course/{courseId}")
    public List<Activity> getByCourseAlias(@PathVariable Long courseId) {
        return repo.findByCourseId(courseId);
    }

    // ================= CREATE =================
    @PostMapping
    @PreAuthorize("hasRole('INVENTORY')")
    public Activity create(@RequestBody Activity activity,
                             @RequestParam Long courseId) {
        if (activity == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Activity payload is required");
        }

        // Backward compatibility: frontend sends {"name":"..."}
        if (activity.getActivityName() == null || activity.getActivityName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Activity name is required");
        }

        Course course = courseRepo.findById(courseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found"));

        activity.setCourse(course);

        if (activity.getCreatedAt() == null) {
            activity.setCreatedAt(java.time.LocalDateTime.now());
        }

        return repo.save(activity);

    }

    // ================= UPDATE =================
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('INVENTORY')")
    public Activity update(@PathVariable Long id,
                             @RequestBody Activity activityDetails,
                             @RequestParam Long courseId) {

        Activity activity = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Activity not found"));

        if (activityDetails == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Activity payload is required");
        }

        // Backward compatibility: frontend sends {"name":"..."}
        if (activityDetails.getActivityName() == null || activityDetails.getActivityName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Activity name is required");
        }

        Course course = courseRepo.findById(courseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found"));

        activity.setActivityName(activityDetails.getActivityName());
        activity.setCourse(course);

        if (activity.getCreatedAt() == null) {
            activity.setCreatedAt(java.time.LocalDateTime.now());
        }

        return repo.save(activity);

    }

    // ================= DELETE =================
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('INVENTORY')")
    public void delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Activity not found");
        }
        try {
            repo.deleteById(id);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete activity because it is linked to a school.");
        }
    }
}


