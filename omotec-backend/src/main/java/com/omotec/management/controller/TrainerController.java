package com.omotec.management.controller;

import com.omotec.management.model.Trainer;
import com.omotec.management.repository.TrainerRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trainers")
public class TrainerController {

    private final TrainerRepository repo;

    public TrainerController(TrainerRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TRAINER','INVENTORY','MANAGER')")
    public List<Trainer> getAll() {
        return repo.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public Trainer add(@RequestBody Trainer t) {
        return repo.save(t);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public Trainer update(@PathVariable Long id, @RequestBody Trainer data) {
        Trainer t = repo.findById(id).orElseThrow();

        t.setName(data.getName());
        t.setRole(data.getRole());

        return repo.save(t);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}

