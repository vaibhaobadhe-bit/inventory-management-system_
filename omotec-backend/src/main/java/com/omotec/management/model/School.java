package com.omotec.management.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String city;

    // Backward-compatible field used by existing frontend JSON.
    // New incremental fields will support proper ERP ownership.
    private String trainer;

    // ===== ERP extensions (incremental; nullable for old rows) =====

    // Optional structured assignment.
    private Long assignedTrainerId;
    private String assignedTrainerName;

    // Allowed master-data mappings.
    @JsonIgnoreProperties({"activities"})
    @ManyToMany
    @JoinTable(
            name = "school_allowed_courses",
            joinColumns = @JoinColumn(name = "school_id"),
            inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private List<Course> allowedCourses = new ArrayList<>();

    @JsonIgnoreProperties({"course"})
    @ManyToMany
    @JoinTable(
            name = "school_allowed_activities",
            joinColumns = @JoinColumn(name = "school_id"),
            inverseJoinColumns = @JoinColumn(name = "activity_id")
    )
    private List<Activity> allowedActivities = new ArrayList<>();

    // ===== Getters/Setters =====
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getCity() {
        return city;
    }

    public String getTrainer() {
        return trainer;
    }

    public Long getAssignedTrainerId() {
        return assignedTrainerId;
    }

    public String getAssignedTrainerName() {
        return assignedTrainerName;
    }

    public List<Course> getAllowedCourses() {
        return allowedCourses;
    }

    public List<Activity> getAllowedActivities() {
        return allowedActivities;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public void setTrainer(String trainer) {
        this.trainer = trainer;
    }

    public void setAssignedTrainerId(Long assignedTrainerId) {
        this.assignedTrainerId = assignedTrainerId;
    }

    public void setAssignedTrainerName(String assignedTrainerName) {
        this.assignedTrainerName = assignedTrainerName;
    }

    public void setAllowedCourses(List<Course> allowedCourses) {
        this.allowedCourses = allowedCourses;
    }

    public void setAllowedActivities(List<Activity> allowedActivities) {
        this.allowedActivities = allowedActivities;
    }
}

