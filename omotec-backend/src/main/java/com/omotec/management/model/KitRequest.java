package com.omotec.management.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class KitRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String trainerName;
    private String schoolName;
    private String courseName;
    private String activityName;
    private int quantity;
    private LocalDate requiredDate;
    private String status; // Pending, Approved, Completed
    private String description;
    @JsonIgnoreProperties({"activities"})
    @ManyToOne
    @JoinColumn(name = "course_id")
    private Course course;
    
    @JsonIgnoreProperties({"course"})
    @ManyToOne
    @JoinColumn(name = "activity_id")
    private Activity activity;

    // Getters & Setters
    public Long getId() { return id; }

    public String getTrainerName() {
         return trainerName; 
        }
    public void setTrainerName(String trainerName) { 
        this.trainerName = trainerName; 
    }
    public String getCourseName() { 
        return courseName; 
    }
    public void setCourseName(String courseName) { 
        this.courseName = courseName; 
    }

    public String getActivityName() {
         return activityName; 
        }
    public void setActivityName(String activityName) {
         this.activityName = activityName;
         }

    public int getQuantity() { 
        return quantity; 
    }
    public void setQuantity(int quantity) {
         this.quantity = quantity; 
        }

    public LocalDate getRequiredDate() { 
        return requiredDate; 
    }
    public void setRequiredDate(LocalDate requiredDate) { 
        this.requiredDate = requiredDate; 
    }
    public String getStatus() { 
        return status; 
    }
    public void setStatus(String status) { 
        this.status = status; 
    }

    public String getSchoolName() {
         return schoolName;
    }
    public void setSchoolName(String schoolName) { 
        this.schoolName = schoolName; 
    }
    public String getDescription() {
    return description;
    }
    public void setDescription(String description) {
    this.description = description;
    }

    public Course getCourse() {
        return course;
    }
    public void setCourse(Course course) {
        this.course = course;
    }

    public Activity getActivity() {
        return activity;
    }
    public void setActivity(Activity activity) {
        this.activity = activity;
    }
}
