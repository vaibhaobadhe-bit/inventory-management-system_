package com.omotec.management.controller;

import com.omotec.management.model.Notification;
import com.omotec.management.repository.NotificationRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository repo;

    public NotificationController(NotificationRepository repo) {
        this.repo = repo;
    }

    private String roleFromAuth(Authentication auth) {
        if (auth == null) return "";
        for (GrantedAuthority a : auth.getAuthorities()) {
            String r = a.getAuthority();
            if (r == null) continue;
            // authorities are like ROLE_TRAINER / ROLE_MANAGER
            if (r.startsWith("ROLE_")) return r.substring("ROLE_".length()).toUpperCase();
        }
        return "";
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<Notification> getForUser(Authentication auth) {
        String username = auth.getName();
        String role = roleFromAuth(auth);

        // Prefer role-scoped + user-scoped notifications.
        // If you later want system-wide role notifications, keep role-only query.
        List<Notification> byUser = repo.findByUsernameAndRoleOrderByCreatedAtDesc(username, role);
        if (!byUser.isEmpty()) return byUser;

        // fallback: role-only
        return repo.findByRoleOrderByCreatedAtDesc(role)
                .stream()
                .sorted(Comparator.comparing(Notification::getCreatedAt).reversed())
                .toList();
    }

    @PutMapping("/read/{id}")
    @PreAuthorize("isAuthenticated()")
    public Notification markRead(@PathVariable Long id, Authentication auth) {
        Notification n = repo.findById(id).orElseThrow();

        // production-safe: only allow marking notifications intended for this username/role OR if username matches.
        String username = auth.getName();
        String role = roleFromAuth(auth);

        boolean allowed = (n.getUsername() != null && n.getUsername().equalsIgnoreCase(username))
                || (n.getRole() != null && n.getRole().equalsIgnoreCase(role));

        if (!allowed) {
            // keep it simple: update is blocked silently via exception
            throw new RuntimeException("Not allowed");
        }

        n.setRead(true);
        n.setCreatedAt(n.getCreatedAt() != null ? n.getCreatedAt() : LocalDateTime.now());
        return repo.save(n);
    }
}

