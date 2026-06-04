# STEP 1 — School model extension (incremental + backward compatible)

## Goal
Add ERP hierarchy fields to `School` without breaking existing School API/UI.

## Existing compatibility constraints
- Current `School` has fields: `id, name, city, trainer(String)`.
- Frontend `Schools.jsx` posts JSON: `{ name, city, trainer }`.
- `/api/schools` returns a list of `School` objects.
- Must preserve existing JSON field names used by frontend.

## Incremental model changes
1) Keep existing `trainer` field as-is.
2) Add new fields (nullable to keep old rows compatible):
   - `grade` (String)
   - `assignedTrainerId` (Long)
   - `assignedTrainerName` (String)
3) Allowed mappings:
   - Add **relationship tables** for allowed courses/activities:
     - `school_allowed_courses` (school_id, course_id)
     - `school_allowed_activities` (school_id, activity_id)
   - Keep them optional (empty for old schools).

## Entity mappings (JPA)
- In `School`:
  - `@ManyToMany` for allowed courses/activities.
  - Use `@JoinTable` with explicit join column names.
  - Keep existing `trainer` field for backward-compatible JSON.


## Backward compatibility in controller serialization
- `SchoolController` will continue to save/update the old fields.
- New fields should be accepted automatically if present.

## Next code steps
- Modify `model/School.java`
- Modify/add repository methods only if needed later.
- Run backend compilation.

