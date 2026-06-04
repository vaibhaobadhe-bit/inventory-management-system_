package com.omotec.management.controller;

import com.omotec.management.model.Kit;
import com.omotec.management.repository.KitRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trainer-kits")
@CrossOrigin(origins = "*")
public class TrainerKitController {

    private final KitRepository repo;

    public TrainerKitController(KitRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Kit> getAll() {
        return repo.findAll(); // later filter by trainer
    }
}
