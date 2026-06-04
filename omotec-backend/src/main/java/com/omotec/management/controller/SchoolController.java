package com.omotec.management.controller;

import com.omotec.management.model.Activity;
import com.omotec.management.model.Course;
import com.omotec.management.model.School;
import com.omotec.management.repository.ActivityRepository;
import com.omotec.management.repository.SchoolRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/schools")
public class SchoolController {

    private final SchoolRepository repo;
    private final ActivityRepository activityRepo;
    private final com.omotec.management.repository.UserRepository userRepository;

    public SchoolController(SchoolRepository repo, ActivityRepository activityRepo, com.omotec.management.repository.UserRepository userRepository) {
        this.repo = repo;
        this.activityRepo = activityRepo;
        this.userRepository = userRepository;
    }

    // ===== Legacy trainer -> assignedTrainer* bridge (incremental; keeps backward compatibility) =====
    private void ensureAssignedTrainerFromLegacyTrainerField(School school) {
        if (school == null) return;

        // If manager already sent structured fields, keep them.
        if (school.getAssignedTrainerId() != null && school.getAssignedTrainerName() != null) {
            return;
        }

        // Legacy payload uses plain-text trainer field.
        String legacyTrainer = school.getTrainer();
        if (legacyTrainer == null || legacyTrainer.isBlank()) {
            return;
        }

        // Try direct username match first.
        userRepository.findByUsername(legacyTrainer.trim()).ifPresent(user -> {
            school.setAssignedTrainerId(user.getId());
            school.setAssignedTrainerName(user.getUsername());
        });

        // If still missing, do nothing (keeps old behavior rather than breaking saves).
    }

    // Existing API (must not break)

    @GetMapping
    @PreAuthorize("hasAnyRole('TRAINER','INVENTORY','MANAGER')")
    public List<School> getAllSchools() {
        return repo.findAll();
    }

    // Required filtered API
    @GetMapping("/by-trainer/{trainerId}")
    @PreAuthorize("hasAnyRole('TRAINER','INVENTORY','MANAGER')")
    public List<School> getSchoolsByTrainer(@PathVariable Long trainerId) {
        // Incremental safe approach: fallback to trainer string matching if assignedTrainerId is null.
        // Later we can add repository queries once trainerId is always populated.
        String trainerName = String.valueOf(trainerId);
        List<School> all = repo.findAll();
        return all.stream()
                .filter(s -> (s.getAssignedTrainerId() != null && s.getAssignedTrainerId().equals(trainerId))
                        || (s.getTrainer() != null && s.getTrainer().equalsIgnoreCase(trainerName)))
                .toList();
    }

    // Fallback when frontend doesn't have numeric trainerId stored.
    @GetMapping("/by-trainer-username/{username}")
    @PreAuthorize("hasAnyRole('TRAINER','INVENTORY','MANAGER')")
    public List<School> getSchoolsByTrainerUsername(@PathVariable String username) {
        if (username == null || username.isBlank()) {
            return List.of();
        }
        String normalized = username.trim();
        List<School> all = repo.findAll();

        return all.stream()
                .filter(s -> {
                    // prefer assignedTrainerName if populated
                    if (s.getAssignedTrainerName() != null) {
                        return s.getAssignedTrainerName().equalsIgnoreCase(normalized);
                    }
                    // otherwise fallback to trainer field if present
                    return s.getTrainer() != null && s.getTrainer().equalsIgnoreCase(normalized);
                })
                .toList();
    }


    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public School addSchool(@RequestBody School school) {
        ensureAssignedTrainerFromLegacyTrainerField(school);
        populateActivities(school);
        return repo.save(school);
    }

    // DELETE SCHOOL
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public void deleteSchool(@PathVariable Long id) {
        repo.deleteById(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public School update(@PathVariable Long id, @RequestBody School s) {
        School sc = repo.findById(id).orElseThrow();
        sc.setName(s.getName());
        sc.setCity(s.getCity());
        sc.setTrainer(s.getTrainer());
        sc.setAssignedTrainerId(s.getAssignedTrainerId());
        sc.setAssignedTrainerName(s.getAssignedTrainerName());
        sc.setAllowedCourses(s.getAllowedCourses());
        populateActivities(sc);
        return repo.save(sc);
    }

    private void populateActivities(School school) {
        if (school.getAllowedCourses() != null && !school.getAllowedCourses().isEmpty()) {
            List<Activity> autoActivities = new ArrayList<>();
            for (Course c : school.getAllowedCourses()) {
                autoActivities.addAll(activityRepo.findByCourseId(c.getId()));
            }
            school.setAllowedActivities(autoActivities);
        } else {
            school.setAllowedActivities(new ArrayList<>());
        }
    }
}


