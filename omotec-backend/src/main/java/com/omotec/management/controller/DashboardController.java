package com.omotec.management.controller;

import com.omotec.management.model.Kit;
import com.omotec.management.model.KitRequest;
import com.omotec.management.model.Trainer;
import com.omotec.management.repository.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final SchoolRepository schoolRepo;
    private final KitRepository kitRepo;
    private final IssueRepository issueRepo;
    private final TrainerRepository trainerRepo;
    private final KitRequestRepository kitRequestRepo;

    public DashboardController(
            SchoolRepository schoolRepo,
            KitRepository kitRepo,
            IssueRepository issueRepo,
            TrainerRepository trainerRepo,
            KitRequestRepository kitRequestRepo) {

        this.schoolRepo = schoolRepo;
        this.kitRepo = kitRepo;
        this.issueRepo = issueRepo;
        this.trainerRepo = trainerRepo;
        this.kitRequestRepo = kitRequestRepo;
    }

    @GetMapping("/counts")
    public Map<String, Long> getCounts() {
        return Map.of(
                "trainers", trainerRepo.count(),
                "schools", schoolRepo.count(),
                "kits", kitRepo.count(),
                "issues", issueRepo.count()
        );
    }

    // ================= MANAGER ANALYTICS =================
    @GetMapping("/analytics")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> analytics() {
        List<KitRequest> all = kitRequestRepo.findAll();

        long totalRequests = all.size();
        long approved = all.stream().filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus())).count();
        long rejected = all.stream().filter(r -> "REJECTED".equalsIgnoreCase(r.getStatus())).count();
        long issued = all.stream().filter(r -> "ISSUED".equalsIgnoreCase(r.getStatus())).count();
        long returned = all.stream().filter(r -> "RETURNED".equalsIgnoreCase(r.getStatus())).count();

        // Most requested courses/trainer based on KitRequest.courseName/trainerName strings.
        List<Map<String, Object>> mostRequestedCourses = topCourses(all, 5);
        List<Map<String, Object>> mostActiveTrainers = topTrainers(all, 5);

        // Monthly trends grouped by requiredDate
        List<Map<String, Object>> monthlyRequestTrends = monthlyTrends(all);

        // Inventory usage trends (approx) based on status transitions with requiredDate
        List<Map<String, Object>> inventoryUsageTrends = inventoryUsageTrends(all);

        return Map.of(
                "totalRequests", totalRequests,
                "approvedRequests", approved,
                "rejectedRequests", rejected,
                "issuedKits", issued,
                "returnedKits", returned,
                "mostRequestedCourses", mostRequestedCourses,
                "mostActiveTrainers", mostActiveTrainers,
                "monthlyRequestTrends", monthlyRequestTrends,
                "inventoryUsageTrends", inventoryUsageTrends
        );
    }

    // ================= TRAINER STATS (for authenticated trainer) =================
    @GetMapping("/trainer-stats")
    @PreAuthorize("hasRole('TRAINER')")
    public Map<String, Object> trainerStats(org.springframework.security.core.Authentication auth) {
        String username = auth.getName();

        List<KitRequest> mine = kitRequestRepo.findAll()
                .stream()
                .filter(r -> r.getTrainerName() != null && r.getTrainerName().equalsIgnoreCase(username))
                .toList();

        long total = mine.size();
        long approved = mine.stream().filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus())).count();
        long pending = mine.stream().filter(r -> "PENDING".equalsIgnoreCase(r.getStatus())).count();
        long returned = mine.stream().filter(r -> "RETURNED".equalsIgnoreCase(r.getStatus())).count();

        List<Map<String, Object>> activityUsage = mine.stream()
                .filter(r -> r.getActivityName() != null)
                .collect(Collectors.groupingBy(KitRequest::getActivityName, Collectors.counting()))
                .entrySet().stream()
                .sorted(Comparator.comparing((Map.Entry<String, Long> e) -> e.getValue()).reversed())
                .limit(8)
                .map(e -> Map.<String, Object>of("name", e.getKey(), "value", e.getValue()))
                .toList();

        return Map.of(
                "myTotalRequests", total,
                "myApprovedRequests", approved,
                "myPendingRequests", pending,
                "myReturnedKits", returned,
                "activityUsage", activityUsage
        );
    }

    // ================= INVENTORY STATS =================
    @GetMapping("/inventory-stats")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> inventoryStats() {
        List<KitRequest> allRequests = kitRequestRepo.findAll();
        List<Kit> kits = kitRepo.findAll();

        List<Map<String, Object>> lowStock = new ArrayList<>();
        for (Kit k : kits) {
            int available = Math.max(0, k.getTotal() - k.getIssued());
            if (available < 5) {
                lowStock.add(Map.<String, Object>of(
                        "name", k.getName(),
                        "total", k.getTotal(),
                        "issued", k.getIssued(),
                        "available", available
                ));
            }
        }
        // Sort by available (ascending) and take top 8
        lowStock = new ArrayList<>(lowStock);
        lowStock.sort(Comparator.comparingInt(m -> (Integer) ((Map<String, Object>) m).get("available")));
        if (lowStock.size() > 8) {
            lowStock = lowStock.subList(0, 8);
        }


        List<Map<String, Object>> mostIssuedKits = kits.stream()
                .map(k -> Map.<String, Object>of("name", k.getName(), "issued", k.getIssued()))
                .sorted(Comparator.comparingInt((Map<String, Object> m) -> (Integer) m.get("issued")).reversed())
                .limit(8)
                .toList();

        long pendingApprovals = allRequests.stream().filter(r -> "PENDING".equalsIgnoreCase(r.getStatus())).count();
        long returnRequests = allRequests.stream().filter(r -> "RETURN_REQUESTED".equalsIgnoreCase(r.getStatus())).count();

        List<Map<String, Object>> stockUsageTrends = inventoryUsageTrends(allRequests);

        return Map.of(
                "lowStockKits", lowStock,
                "mostIssuedKits", mostIssuedKits,
                "pendingApprovals", pendingApprovals,
                "returnRequests", returnRequests,
                "stockUsageTrends", stockUsageTrends
        );
    }

    // ===== helpers =====
    private static List<Map<String, Object>> topCourses(List<KitRequest> all, int limit) {
        return all.stream()
                .filter(r -> r.getCourseName() != null)
                .collect(Collectors.groupingBy(KitRequest::getCourseName, Collectors.counting()))
                .entrySet().stream()
                .sorted(Comparator.comparing((Map.Entry<String, Long> e) -> e.getValue()).reversed())
                .limit(limit)
                .map(e -> Map.<String, Object>of("name", e.getKey(), "value", e.getValue()))
                .toList();
    }

    private static List<Map<String, Object>> topTrainers(List<KitRequest> all, int limit) {
        return all.stream()
                .filter(r -> r.getTrainerName() != null)
                .collect(Collectors.groupingBy(KitRequest::getTrainerName, Collectors.counting()))
                .entrySet().stream()
                .sorted(Comparator.comparing((Map.Entry<String, Long> e) -> e.getValue()).reversed())
                .limit(limit)
                .map(e -> Map.<String, Object>of("name", e.getKey(), "value", e.getValue()))
                .toList();
    }

    private static List<Map<String, Object>> monthlyTrends(List<KitRequest> all) {
        // group by requiredDate -> YearMonth
        Map<YearMonth, List<KitRequest>> grouped = all.stream()
                .filter(r -> r.getRequiredDate() != null)
                .collect(Collectors.groupingBy(r -> YearMonth.from(r.getRequiredDate())));

        List<YearMonth> months = new ArrayList<>(grouped.keySet());
        months.sort(Comparator.naturalOrder());

        List<Map<String, Object>> out = new ArrayList<>();
        for (YearMonth ym : months) {
            List<KitRequest> list = grouped.get(ym);
            long total = list.size();
            long approved = list.stream().filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus())).count();
            long rejected = list.stream().filter(r -> "REJECTED".equalsIgnoreCase(r.getStatus())).count();
            long issued = list.stream().filter(r -> "ISSUED".equalsIgnoreCase(r.getStatus())).count();
            long returned = list.stream().filter(r -> "RETURNED".equalsIgnoreCase(r.getStatus())).count();

            out.add(Map.<String, Object>of(
                    "month", ym.toString(),
                    "totalRequests", total,
                    "approvedRequests", approved,
                    "rejectedRequests", rejected,
                    "issuedKits", issued,
                    "returnedKits", returned
            ));
        }
        return out;
    }

    private static List<Map<String, Object>> inventoryUsageTrends(List<KitRequest> all) {
        Map<YearMonth, List<KitRequest>> grouped = all.stream()
                .filter(r -> r.getRequiredDate() != null)
                .collect(Collectors.groupingBy(r -> YearMonth.from(r.getRequiredDate())));

        List<YearMonth> months = new ArrayList<>(grouped.keySet());
        months.sort(Comparator.naturalOrder());

        List<Map<String, Object>> out = new ArrayList<>();
        for (YearMonth ym : months) {
            List<KitRequest> list = grouped.get(ym);
            long issued = list.stream().filter(r -> "ISSUED".equalsIgnoreCase(r.getStatus())).count();
            long returned = list.stream().filter(r -> "RETURNED".equalsIgnoreCase(r.getStatus())).count();
            out.add(Map.<String, Object>of(
                    "month", ym.toString(),
                    "issued", issued,
                    "returned", returned
            ));
        }
        return out;
    }
}


