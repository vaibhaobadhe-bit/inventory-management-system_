package com.omotec.management.controller;

import com.omotec.management.model.User;
import com.omotec.management.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;


@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'INVENTORY')")
    public List<User> getAll() {
        return userRepository.findAll();
    }

    @GetMapping("/trainers")
    @PreAuthorize("hasAnyRole('MANAGER', 'INVENTORY')")
    public List<User> getTrainers() {
        return userRepository.findAll().stream()
                .filter(u -> "TRAINER".equalsIgnoreCase(u.getRole()))
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public User create(@RequestBody User payload) {
        validateCreatePayload(payload);

        userRepository.findByUsername(payload.getUsername())
                .ifPresent(u -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
                });

        User u = new User();
        u.setUsername(payload.getUsername().trim());
        u.setPassword(passwordEncoder.encode(payload.getPassword()));
        u.setRole(normalizeRole(payload.getRole()));
        u.setFullName(payload.getFullName() != null ? payload.getFullName().trim() : null);
        u.setEmail(payload.getEmail() != null ? payload.getEmail().trim() : null);
        u.setPhone(payload.getPhone() != null ? payload.getPhone().trim() : null);
        u.setIsActive(true);

        return userRepository.save(u);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public User update(@PathVariable Long id, @RequestBody User payload) {
        validateUpdatePayload(payload);

        User existing = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (payload.getUsername() != null && !payload.getUsername().trim().equalsIgnoreCase(existing.getUsername())) {
            userRepository.findByUsername(payload.getUsername().trim())
                    .ifPresent(u -> {
                        if (!u.getId().equals(id)) {
                            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
                        }
                    });
            existing.setUsername(payload.getUsername().trim());
        }

        if (payload.getRole() != null) {
            existing.setRole(normalizeRole(payload.getRole()));
        }

        if (payload.getPassword() != null && !payload.getPassword().trim().isEmpty()) {
            existing.setPassword(passwordEncoder.encode(payload.getPassword()));
        }

        if (payload.getFullName() != null) {
            existing.setFullName(payload.getFullName().trim());
        }

        if (payload.getEmail() != null) {
            existing.setEmail(payload.getEmail().trim());
        }

        if (payload.getPhone() != null) {
            existing.setPhone(payload.getPhone().trim());
        }

        return userRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public void delete(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        userRepository.deleteById(id);
    }

    @PutMapping("/toggle/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public User toggleActive(@PathVariable Long id, @RequestParam(required = false) Boolean active) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (active != null) {
            existing.setIsActive(active);
        }

        return userRepository.save(existing);
    }

    private void validateCreatePayload(User payload) {
        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Body is required");
        }
        if (payload.getUsername() == null || payload.getUsername().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        if (payload.getPassword() == null || payload.getPassword().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }
        if (payload.getRole() == null || payload.getRole().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role is required");
        }
        if (!isValidRole(payload.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role");
        }
        if (payload.getFullName() == null || payload.getFullName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full Name is required");
        }
        if (payload.getEmail() == null || payload.getEmail().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        if (!payload.getEmail().trim().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email format");
        }
        if (payload.getPhone() == null || payload.getPhone().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number is required");
        }
        if (!payload.getPhone().trim().matches("^\\+?[0-9]{10,15}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid phone number format");
        }
    }

    private void validateUpdatePayload(User payload) {
        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Body is required");
        }
        if (payload.getUsername() != null && payload.getUsername().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username cannot be empty");
        }
        if (payload.getRole() != null && !isValidRole(payload.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role");
        }
        if (payload.getPassword() != null && payload.getPassword().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password cannot be empty");
        }
        if (payload.getFullName() != null && payload.getFullName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full Name cannot be empty");
        }
        if (payload.getEmail() != null) {
            if (payload.getEmail().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email cannot be empty");
            }
            if (!payload.getEmail().trim().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email format");
            }
        }
        if (payload.getPhone() != null) {
            if (payload.getPhone().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number cannot be empty");
            }
            if (!payload.getPhone().trim().matches("^\\+?[0-9]{10,15}$")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid phone number format");
            }
        }
    }

    private boolean isValidRole(String role) {
        if (role == null) return false;
        String r = role.trim().toUpperCase();
        return r.equals("TRAINER") || r.equals("INVENTORY") || r.equals("MANAGER");
    }

    private String normalizeRole(String role) {
        return role.trim().toUpperCase();
    }
}

