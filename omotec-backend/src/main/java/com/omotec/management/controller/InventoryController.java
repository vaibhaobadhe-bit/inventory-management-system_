package com.omotec.management.controller;

import com.omotec.management.model.Kit;
import com.omotec.management.service.InventoryService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService service;

    public InventoryController(InventoryService service) {
        this.service = service;
    }


    // GET ALL KITS
    @GetMapping
    @PreAuthorize("hasAnyRole('INVENTORY','MANAGER')")
    public List<Kit> getAllKits() {
        return service.getAllKits();
    }

    // ADD NEW KIT
    @PostMapping
    @PreAuthorize("hasRole('INVENTORY')")
    public Kit addKit(@RequestBody Kit kit) {
        return service.addKit(kit);
    }

    // UPDATE KIT (ISSUE / EDIT)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('INVENTORY')")
    public Kit updateKit(@PathVariable Long id, @RequestBody Kit kitDetails) {
        return service.updateKit(id, kitDetails);
    }

    // DELETE KIT (OPTIONAL)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('INVENTORY')")
    public void deleteKit(@PathVariable Long id) {
        service.deleteKit(id);
    }
}




