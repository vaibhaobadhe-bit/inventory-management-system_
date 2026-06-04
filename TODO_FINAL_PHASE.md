# TODO: OMOTEC FINAL PHASE (Enterprise Cleanup/Refactor/Deployment)

## Phase 1 — Service Layer Extraction
- [x] Create `com.omotec.management.service` package
- [x] Create: `KitRequestService`, `InventoryService`, `NotificationService`, `AuditService`, `IssueService`, `UserService` (InventoryService implemented; others pending)
- [x] KitRequest business logic moved to service (Inventory already completed)
- [x] Move business logic out of controllers (keep endpoint URLs & responses unchanged)

- [ ] Wire controllers to services (thin controller = routing only)
- [x] Add `@Transactional` on write operations


## Phase 2 — DTO Layer
- [ ] Create `com.omotec.management.dto` package
- [ ] Implement: `UserDTO`, `LoginDTO`, `KitRequestDTO`, `IssueDTO`, `NotificationDTO`
- [ ] Service-layer mapping entity -> DTO
- [ ] Controllers return DTOs while preserving frontend JSON fields

## Phase 3 — Global Exception Handler
- [ ] Improve `GlobalExceptionHandler` with structured error responses
- [ ] Map not found / forbidden / conflicts
- [ ] Keep fallback behavior safe and compatible

## Phase 4 — Validation
- [ ] Add Jakarta validation annotations on DTOs
- [ ] Update controller request bodies to use `@Valid`

## Phase 5 — Frontend Service Layer
- [ ] Create `omotec-frontend/src/services` directory
- [ ] Implement: `authService.js`, `inventoryService.js`, `requestService.js`, `userService.js`
- [ ] Migrate pages to use services without breaking existing UI/flow


## Phase 6 — Docker + Deployment Setup
- [ ] Add backend `Dockerfile`
- [ ] Add `docker-compose.yml` (backend + MySQL)
- [ ] Add deployment env guidance for Railway/Render
- [ ] Ensure CORS + env-based API base URL for Vercel


## Phase 7 — Documentation Generation
- [ ] Root `README.md` (or expand existing) with:
  - architecture diagram references
  - ER diagram references
  - API docs
  - workflow diagrams (kit lifecycle)
  - deployment guide
- [ ] Add Mermaid diagrams if images are not available

## Build/Test Checkpoints
- [ ] Backend builds successfully (`mvn clean package`)
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Smoke test: kit request lifecycle + notifications

