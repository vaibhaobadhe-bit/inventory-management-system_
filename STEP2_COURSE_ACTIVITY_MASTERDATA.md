# STEP 2: Course & Activity master-data persistence + CRUD (Inventory master data)

## Target
- Courses and Activities must be persisted in MySQL
- Inventory creates/updates/deletes (JWT role: INVENTORY)
- Read endpoints remain available for Manager/Trainer dropdowns
- Endpoint URLs must remain stable

## Backend changes required
1) Secure write endpoints
- Add `@PreAuthorize("hasRole('INVENTORY')")` to:
  - POST/PUT/DELETE in `CourseController`
  - POST/PUT/DELETE in `ActivityController`

2) ERP fields alignment without breaking current frontend
- Keep existing JSON fields (`name`) working
- Add new nullable fields to match required ERP spec:
  - Course: `courseName`, `description`, `createdAt`
  - Activity: `activityName`, `description`, `grade`, `createdAt`
- Preserve backward compatibility by mapping `name` <-> `courseName/activityName`.

3) Activity must always belong to Course
- Enforce at controller/service level using `courseId` and `activity.setCourse(course)`.

## Frontend
- Inventory.jsx already exists and uses current field `name`.
- No breaking changes required; controller should accept both payloads.

## Verification checklist
- Build backend and frontend
- Confirm:
  - GET /api/courses returns persisted courses
  - GET /api/activities/by-course/{id} returns activities for the selected course
  - Trainer/Manager dropdowns populate after data insertion

