package com.omotec.management.controller;

import com.omotec.management.model.User;
import com.omotec.management.repository.UserRepository;
import com.omotec.management.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(JwtUtil jwtUtil, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        System.out.println("=== LOGIN ATTEMPT: " + username + " ===");
        System.out.println(
                "=== ALL USERS: " + userRepository.findAll().stream().map(User::getUsername).toList()
        );

        if (username == null || username.isEmpty() || password == null || password.isEmpty()) {
            return Map.of("success", false, "message", "Username and password required");
        }

        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            System.out.println("=== USER NOT FOUND ===");
            return Map.of("success", false, "message", "Invalid credentials");
        }

        System.out.println(
                "=== USER FOUND: " + user.getUsername() + " role: " + user.getRole() + " ==="
        );
        System.out.println(
                "=== PASSWORD MATCH: " + passwordEncoder.matches(password, user.getPassword()) + " ==="
        );

        if (!passwordEncoder.matches(password, user.getPassword())) {
            return Map.of("success", false, "message", "Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().toUpperCase());

        return Map.of(
                "success", true,
                "token", token,
                "username", user.getUsername(),
                "role", user.getRole().toUpperCase(),
                "fullName", user.getFullName() != null ? user.getFullName() : ""
        );
    }
}

