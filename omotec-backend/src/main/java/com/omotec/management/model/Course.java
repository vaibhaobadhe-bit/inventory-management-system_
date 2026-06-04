package com.omotec.management.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

import java.util.List;

@Entity
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ERP schema fields (incremental: legacy JSON uses `name`)
    private String courseName;

    private String description;

    private LocalDateTime createdAt;

    // Backward-compatible alias for existing frontend JSON.
    // Must NOT be @Transient because Jackson must be able to bind `name` -> courseName.
    @com.fasterxml.jackson.annotation.JsonProperty("name")
    public String getName() {
        return courseName;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("name")
    public void setName(String name) {
        this.courseName = name;
    }


    @JsonIgnore
    @OneToMany(mappedBy = "course")
    private List<Activity> activities;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

