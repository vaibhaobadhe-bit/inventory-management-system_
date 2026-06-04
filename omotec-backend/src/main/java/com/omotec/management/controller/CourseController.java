package com.omotec.management.controller;

import com.omotec.management.model.Course;
import com.omotec.management.model.Kit;
import com.omotec.management.repository.CourseRepository;
import com.omotec.management.repository.KitRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseRepository repo;
    private final com.omotec.management.repository.ActivityRepository activityRepo;
    private final KitRepository kitRepo;

    public CourseController(CourseRepository repo, com.omotec.management.repository.ActivityRepository activityRepo, KitRepository kitRepo) {
        this.repo = repo;
        this.activityRepo = activityRepo;
        this.kitRepo = kitRepo;
    }

    @GetMapping
    public List<Course> getAll() {
        return repo.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('INVENTORY')")
    public Course create(@RequestBody Course course) {
        if (course == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Course payload is required");
        }

        // Backward compatibility: frontend sends {"name":"..."}
        // Persist into ERP field courseName.
        if (course.getCourseName() == null || course.getCourseName().trim().isEmpty()) {
            // if JSON was bound via alias, course.getName() should be non-null.
            if (course.getName() != null && !course.getName().trim().isEmpty()) {
                course.setCourseName(course.getName());
            }
        }

        if (course.getCourseName() == null || course.getCourseName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Course name is required");
        }


        if (course.getCreatedAt() == null) {
            course.setCreatedAt(java.time.LocalDateTime.now());
        }

        Course saved = repo.save(course);

        // Auto create corresponding Kit record for compatibility
        if (saved != null && saved.getId() != null) {
            Kit kit = new Kit();
            kit.setId(saved.getId());
            kit.setName(saved.getCourseName());
            kit.setTotal(100); // default starting total
            kit.setIssued(0);
            kitRepo.save(kit);
        }

        return saved;

    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('INVENTORY')")
    public Course update(@PathVariable Long id, @RequestBody Course courseDetails) {
        Course course = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found"));

        if (courseDetails == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Course payload is required");
        }

        // Backward compatibility: frontend sends {"name":"..."}
        if (courseDetails.getCourseName() == null || courseDetails.getCourseName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Course name is required");
        }

        course.setCourseName(courseDetails.getCourseName());

        // Only set createdAt if missing; preserve original.
        if (course.getCreatedAt() == null) {
            course.setCreatedAt(java.time.LocalDateTime.now());
        }

        Course saved = repo.save(course);

        // Update corresponding Kit record name
        kitRepo.findById(saved.getId()).ifPresent(k -> {
            k.setName(saved.getCourseName());
            kitRepo.save(k);
        });

        return saved;

    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('INVENTORY')")
    public void delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found");
        }
        if (!activityRepo.findByCourseId(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete course: It has linked activities.");
        }
        try {
            repo.deleteById(id);
            // Also delete the Kit record if it exists
            kitRepo.findById(id).ifPresent(k -> kitRepo.delete(k));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete course because it is linked to a school.");
        }
    }
}

