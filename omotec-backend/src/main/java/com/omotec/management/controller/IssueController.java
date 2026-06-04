package com.omotec.management.controller;

import com.omotec.management.model.Issue;
import com.omotec.management.repository.IssueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/issues")
public class IssueController {

    @Autowired
    private IssueRepository repo;

    // GET ALL ISSUES
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER','INVENTORY','TRAINER')")
    public List<Issue> getAllIssues() {
        return repo.findAll();
    }

    // ADD NEW ISSUE
    @PostMapping
    @PreAuthorize("hasRole('TRAINER')")
    public Issue createIssue(@RequestBody Issue issue) {
        return repo.save(issue);
    }

    // UPDATE ISSUE
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','INVENTORY','TRAINER')")
    public Issue updateIssue(@PathVariable Long id, @RequestBody Issue issueDetails) {
        Issue issue = repo.findById(id).orElseThrow();

        issue.setTitle(issueDetails.getTitle());
        issue.setStatus(issueDetails.getStatus());
        issue.setDescription(issueDetails.getDescription());
        issue.setCategory(issueDetails.getCategory());
        issue.setPriority(issueDetails.getPriority());

        return repo.save(issue);
    }

    // DELETE ISSUE
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public void deleteIssue(@PathVariable Long id) {
        repo.deleteById(id);
    }
}

