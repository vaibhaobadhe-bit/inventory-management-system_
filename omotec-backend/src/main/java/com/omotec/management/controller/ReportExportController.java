package com.omotec.management.controller;

import com.omotec.management.model.AuditLog;
import com.omotec.management.model.Kit;
import com.omotec.management.model.KitRequest;
import com.omotec.management.repository.AuditLogRepository;
import com.omotec.management.repository.KitRepository;
import com.omotec.management.repository.KitRequestRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

@RestController

@RequestMapping("/api/reports")
public class ReportExportController {

    private final KitRepository kitRepo;
    private final KitRequestRepository kitRequestRepo;
    private final AuditLogRepository auditLogRepo;

    public ReportExportController(KitRepository kitRepo,
                                  KitRequestRepository kitRequestRepo,
                                  AuditLogRepository auditLogRepo) {
        this.kitRepo = kitRepo;
        this.kitRequestRepo = kitRequestRepo;
        this.auditLogRepo = auditLogRepo;
    }

    // ================= INVENTORY =================

    @GetMapping("/inventory/excel")
    @PreAuthorize("hasAnyRole('INVENTORY','MANAGER')")
    public void exportInventoryExcel(HttpServletResponse response) throws IOException {
        List<Kit> kits = kitRepo.findAll();

        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, contentDisposition("inventory-report.xlsx"));

        try (Workbook wb = new XSSFWorkbook(); OutputStream os = response.getOutputStream()) {
            Sheet sheet = wb.createSheet("Inventory");

            int r = 0;
            Row header = sheet.createRow(r++);
            createCell(header, 0, "Kit Name");
            createCell(header, 1, "Total");
            createCell(header, 2, "Issued");
            createCell(header, 3, "Available");

            for (Kit k : kits) {
                int available = k.getTotal() - k.getIssued();
                Row row = sheet.createRow(r++);
                createCell(row, 0, nullToEmpty(k.getName()));
                createCell(row, 1, k.getTotal());
                createCell(row, 2, k.getIssued());
                createCell(row, 3, available);
            }

            wb.write(os);
            os.flush();
        }
    }

    @GetMapping("/inventory/pdf")
    @PreAuthorize("hasAnyRole('INVENTORY','MANAGER')")
    public void exportInventoryPdf(HttpServletResponse response) throws IOException {
        List<Kit> kits = kitRepo.findAll();

        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/pdf");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, contentDisposition("inventory-report.pdf"));

        try (OutputStream os = response.getOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
            PdfWriter.getInstance(document, os);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 14, Font.BOLD);
            document.add(new Paragraph("Inventory Report", titleFont));
            document.add(new Paragraph(" ", titleFont));

            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            addPdfHeaderCell(table, "Kit Name");
            addPdfHeaderCell(table, "Total");
            addPdfHeaderCell(table, "Issued");
            addPdfHeaderCell(table, "Available");

            for (Kit k : kits) {
                int available = k.getTotal() - k.getIssued();
                table.addCell(nullToEmpty(k.getName()));
                table.addCell(String.valueOf(k.getTotal()));
                table.addCell(String.valueOf(k.getIssued()));
                table.addCell(String.valueOf(available));
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            // Re-throw as IOException so Spring can handle response properly.
            throw new IOException("Failed to generate inventory PDF", e);
        }
    }

    // ================= REQUESTS =================

    @GetMapping("/requests/excel")
    @PreAuthorize("hasAnyRole('INVENTORY','MANAGER')")
    public void exportRequestsExcel(HttpServletResponse response) throws IOException {
        List<KitRequest> reqs = kitRequestRepo.findAll();

        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, contentDisposition("kit-request-report.xlsx"));

        try (Workbook wb = new XSSFWorkbook(); OutputStream os = response.getOutputStream()) {
            Sheet sheet = wb.createSheet("Kit Requests");

            int r = 0;
            Row header = sheet.createRow(r++);
            createCell(header, 0, "Trainer");
            createCell(header, 1, "Course");
            createCell(header, 2, "Activity");
            createCell(header, 3, "Quantity");
            createCell(header, 4, "Status");
            createCell(header, 5, "Date");

            for (KitRequest q : reqs) {
                Row row = sheet.createRow(r++);
                createCell(row, 0, nullToEmpty(q.getTrainerName()));
                createCell(row, 1, q.getCourseName() != null ? q.getCourseName() : (q.getCourse() != null ? q.getCourse().getName() : ""));
                createCell(row, 2, nullToEmpty(q.getActivityName()));

                createCell(row, 3, q.getQuantity());
                createCell(row, 4, nullToEmpty(q.getStatus()));
                createCell(row, 5, q.getRequiredDate() != null ? q.getRequiredDate().toString() : "");
            }

            wb.write(os);
            os.flush();
        }
    }

    @GetMapping("/requests/pdf")
    @PreAuthorize("hasAnyRole('INVENTORY','MANAGER')")
    public void exportRequestsPdf(HttpServletResponse response) throws IOException {
        List<KitRequest> reqs = kitRequestRepo.findAll();

        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/pdf");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, contentDisposition("kit-request-report.pdf"));

        try (OutputStream os = response.getOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
            PdfWriter.getInstance(document, os);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 14, Font.BOLD);
            document.add(new Paragraph("Kit Request Report", titleFont));
            document.add(new Paragraph(" ", titleFont));

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            addPdfHeaderCell(table, "Trainer");
            addPdfHeaderCell(table, "Course");
            addPdfHeaderCell(table, "Activity");
            addPdfHeaderCell(table, "Quantity");
            addPdfHeaderCell(table, "Status");
            addPdfHeaderCell(table, "Date");

            for (KitRequest q : reqs) {
                table.addCell(nullToEmpty(q.getTrainerName()));
                String course = q.getCourseName() != null ? q.getCourseName() : (q.getCourse() != null ? q.getCourse().getName() : "");
                String activity = nullToEmpty(q.getActivityName());


                table.addCell(nullToEmpty(course));
                table.addCell(nullToEmpty(activity));

                table.addCell(String.valueOf(q.getQuantity()));
                table.addCell(nullToEmpty(q.getStatus()));
                table.addCell(q.getRequiredDate() != null ? q.getRequiredDate().toString() : "");
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            throw new IOException("Failed to generate requests PDF", e);
        }
    }

    // ================= AUDIT =================

    @GetMapping("/audit/excel")
    @PreAuthorize("hasAnyRole('INVENTORY','MANAGER')")
    public void exportAuditExcel(HttpServletResponse response) throws IOException {
        List<AuditLog> logs = auditLogRepo.findAll();

        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, contentDisposition("audit-log-report.xlsx"));

        try (Workbook wb = new XSSFWorkbook(); OutputStream os = response.getOutputStream()) {
            Sheet sheet = wb.createSheet("Audit Logs");

            int r = 0;
            Row header = sheet.createRow(r++);
            createCell(header, 0, "Action");
            createCell(header, 1, "User");
            createCell(header, 2, "Timestamp");

            DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

            for (AuditLog l : logs) {
                Row row = sheet.createRow(r++);
                createCell(row, 0, nullToEmpty(l.getAction()));
                createCell(row, 1, nullToEmpty(l.getPerformedBy()));
                createCell(row, 2, l.getTimestamp() != null ? fmt.format(l.getTimestamp()) : "");
            }

            wb.write(os);
            os.flush();
        }
    }

    @GetMapping("/audit/pdf")
    @PreAuthorize("hasAnyRole('INVENTORY','MANAGER')")
    public void exportAuditPdf(HttpServletResponse response) throws IOException {
        List<AuditLog> logs = auditLogRepo.findAll();

        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/pdf");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, contentDisposition("audit-log-report.pdf"));

        try (OutputStream os = response.getOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
            PdfWriter.getInstance(document, os);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 14, Font.BOLD);
            document.add(new Paragraph("Audit Log Report", titleFont));
            document.add(new Paragraph(" ", titleFont));

            PdfPTable table = new PdfPTable(3);
            table.setWidthPercentage(100);
            addPdfHeaderCell(table, "Action");
            addPdfHeaderCell(table, "User");
            addPdfHeaderCell(table, "Timestamp");

            DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
            for (AuditLog l : logs) {
                table.addCell(nullToEmpty(l.getAction()));
                table.addCell(nullToEmpty(l.getPerformedBy()));
                table.addCell(l.getTimestamp() != null ? fmt.format(l.getTimestamp()) : "");
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            throw new IOException("Failed to generate audit PDF", e);
        }
    }

    // ================= helpers =================

    private static String contentDisposition(String filename) {
        // RFC 5987 for UTF-8 file names
        String encoded = new String(filename.getBytes(StandardCharsets.UTF_8), StandardCharsets.ISO_8859_1);

        return "attachment; filename=\"" + encoded + "\"";
    }

    private static void createCell(Row row, int col, String value) {
        Cell cell = row.createCell(col, org.apache.poi.ss.usermodel.CellType.STRING);
        cell.setCellValue(value == null ? "" : value);
    }

    private static void createCell(Row row, int col, int value) {
        Cell cell = row.createCell(col, org.apache.poi.ss.usermodel.CellType.NUMERIC);
        cell.setCellValue(value);
    }

    private static void addPdfHeaderCell(PdfPTable table, String text) {
        Font font = new Font(Font.HELVETICA, 10, Font.BOLD);
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new Paragraph(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);

        table.addCell(cell);
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}

