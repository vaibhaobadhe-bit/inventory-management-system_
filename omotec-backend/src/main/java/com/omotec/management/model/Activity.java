package com.omotec.management.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ERP schema fields (incremental: legacy JSON uses `name`)
    private String activityName;

    private String description;

    private String grade;

    private LocalDateTime createdAt;

    @ManyToOne(optional = false)
    @JoinColumn(name = "course_id")
    private Course course;

    // Backward-compatible alias for existing frontend JSON.
    // Must NOT be @Transient because Jackson must be able to bind `name` -> activityName.
    @com.fasterxml.jackson.annotation.JsonProperty("name")
    public String getName() {
        return activityName;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("name")
    public void setName(String name) {
        this.activityName = name;
    }


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getActivityName() {
        return activityName;
    }

    public void setActivityName(String activityName) {
        this.activityName = activityName;
    }

    public String getDescription() {
        return description;
    }           

    public void setDescription(String description) {
        this.description = description;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }
}

