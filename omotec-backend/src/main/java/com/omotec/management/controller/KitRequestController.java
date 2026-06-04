package com.omotec.management.controller;

import com.omotec.management.model.KitRequest;

import com.omotec.management.service.KitRequestService;

import org.springframework.security.access.prepost.PreAuthorize;


import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


import java.util.List;


@RestController
@RequestMapping("/api/kit-requests")
public class KitRequestController {

    private final KitRequestService service;

    public KitRequestController(KitRequestService service) {
        this.service = service;
    }



    // ================= GET ALL =================
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER','INVENTORY')")
    public List<KitRequest> getAll() {
        return service.getAll();
    }

    // ================= CREATE =================
    @PostMapping
    @PreAuthorize("hasRole('TRAINER')")
    public KitRequest create(@RequestBody KitRequest r, Authentication auth) {
        return service.create(r, auth);
    }

    // ================= UPDATE STATUS =================
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('INVENTORY')")
    public KitRequest updateStatus(@PathVariable Long id,
                                     @RequestParam String action,
                                     Authentication auth) {
        return service.updateStatus(id, action, auth);
    }

    // ================= TRAINER RETURN REQUEST =================
    @PutMapping("/return/{id}")
    @PreAuthorize("hasAnyRole('TRAINER','INVENTORY')")
    public KitRequest requestReturn(@PathVariable Long id,
                                      Authentication auth) {
        return service.requestReturn(id, auth);
    }


    // ================= DELETE =================
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public void delete(@PathVariable Long id,
                         Authentication auth) {
        service.delete(id, auth);
    }

    // ================= MY REQUESTS =================
    @GetMapping("/my")
    @PreAuthorize("hasRole('TRAINER')")
    public List<KitRequest> getMyRequests(Authentication auth) {
        return service.getMyRequests(auth);
    }
}
