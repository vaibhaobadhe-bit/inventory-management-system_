# TODO: OMOTEC Backend Refactor (Fix 1..8)

## Step 1 — Baseline compatibility check
- [x] Inventory current API response shapes used by frontend (kit requests fields in Dashboard.jsx)
- [x] Identify all controller methods that return entities directly

## Step 2 — Auth (Fix 1)
- [x] Wire UserRepository + BCryptPasswordEncoder into AuthController
- [x] Implement password verification and failure handling
- [x] Add default users seeding (via CommandLineRunner or data.sql)

## Step 3 — JWT secret externalization (Fix 2)
- [ ] Open JwtUtil.java and externalize jwt.secret + jwt.expiration
- [ ] Update application.properties with jwt.secret and jwt.expiration
- [ ] Verify build: mvnw.cmd clean compile
- [ ] Add .env.example (optional)

## Step 4 — Service layer extraction (Fix 3)
- [ ] Create service package
- [ ] Implement KitRequestService moving business logic out of KitRequestController
- [ ] Add @Transactional where modifying
- [ ] Keep controller endpoints/URLs/DTO/response shapes unchanged

## Step 5 — DTO layer (Fix 4)
- [ ] Create dto package and DTO records
- [ ] Map entity -> DTO in service before returning
- [ ] Preserve JSON fields used by frontend
- [ ] Remove redundant courseName/schoolName/activityName only if DTO supplies them

## Step 6 — Status enum (Fix 5)
- [ ] Introduce KitStatus enum
- [ ] Replace String status with @Enumerated(EnumType.STRING) KitStatus
- [ ] Update status transition logic
- [ ] Ensure JSON serialization remains plain string

## Step 7 — Fix in-memory filter bug (Fix 6)
- [ ] Update KitRequestController.getMyRequests to use repo.findByTrainerName

## Step 8 — CORS wildcard removal (Fix 7)
- [ ] Remove @CrossOrigin(origins="*") from InventoryController (and other controllers where applicable)

## Step 9 — GlobalExceptionHandler improvements (Fix 8)
- [ ] Add specific handlers for EntityNotFoundException -> 404, AccessDeniedException -> 403, IllegalStateException -> 409
- [ ] Return consistent error body: {"error": "...", "message": "..."}
- [ ] Keep RuntimeException fallback returning 400

## Step 10 — Build & runtime smoke tests
- [ ] mvn test/build for backend
- [ ] verify login still works from frontend
- [ ] verify kit request lifecycle endpoints

