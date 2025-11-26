# MySchoolBus API

Backend: Node.js + Express + TypeScript + PostgreSQL

Base URL: http://localhost:4000/api/v1

## Environment

Minimal required variables:

```
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/myschoolbus
JWT_ACCESS_SECRET=change_me
JWT_ACCESS_EXPIRES=15m

# SMTP (Brevo)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=2525
SMTP_USER=<brevo-smtp-user>
SMTP_PASS=<brevo-smtp-pass>
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
BREVO_SENDER_EMAIL=no-reply@myschoolbus.local
BREVO_SENDER_NAME=MySchoolBus

# OTP
OTP_TTL_MINUTES=10
```

Notes:
- For port 2525/587 use `SMTP_SECURE=false` (STARTTLS) and `SMTP_REQUIRE_TLS=true`.
- Emails fail with wrong SSL if `SMTP_SECURE=true` on 2525.

## Health
- GET `/health`
  - 200: `{ success: true, message: "healthy", data: { uptime, db: "up" } }`
  - 503: `{ success: false, message: "unhealthy", data: { uptime, db: "down" } }`

## Public
- GET `/public/schools`
  - 200: `{ success: true, data: [{ id, school_code, name }, ...] }`

## Auth
Base: `/auth`

- POST `/login`
  - Body:
    ```json
    { "identifier": "email-or-username", "password": "secret" }
    ```
  - 200:
    ```json
    { "success": true, "message": "login_success", "data": { "token": "<jwt>", "user": { "id": "...", "email": "...", "role": "parent", "email_verified": true } } }
    ```
  - 401: `{ success:false, message:"invalid_credentials" | "email_not_verified" | "account_not_verified" }`

- POST `/forgot-password`
  - Body: `{ "email": "user@example.com" }`
  - 200: `{ success:true, message:"otp_sent" }`

- POST `/reset-password`
  - Body:
    ```json
    { "email": "user@example.com", "code": "123456", "newPassword": "newpass123" }
    ```
  - 200: `{ success:true, message:"password_reset_success" }`

- POST `/verify-email`
  - Body: `{ "email": "user@example.com", "code": "123456" }`
  - 200: `{ success:true, message:"email_verified" }`

- POST `/resend-email-verification`
  - Body: `{ "email": "user@example.com" }`
  - 200: `{ success:true, message:"otp_resent" }`

### Signups (Transactional)
All signups are inside a DB transaction. OTP insert and email send happen before COMMIT; failures roll back the user/profile.

- POST `/signup/school` (multipart/form-data)
  - Fields: `name,email,phone,state?,city?,country?,address?,latitude?,longitude?,password`
  - File: `logo` (optional)
  - 201: `{ success:true, message:"signup_school_success", data:{ id, email } }`

- POST `/signup/parent`
  - Body:
    ```json
    {
      "fullname":"Jane Doe","phonenumber":"+234...","nin":"...","relationship":"Mother",
      "school_id":"<uuid>","email":"parent@example.com","password":"secret",
      "address":"...","latitude":6.45,"longitude":3.39
    }
    ```
  - 201: `{ success:true, message:"signup_parent_success", data:{ id, email } }`

- POST `/signup/teacher` (multipart/form-data)
  - Fields: `name,nin?,gender,dob?,nationality?,state_of_origin?,email,phone?,school_id,password`
  - File: `passport` (optional)
  - 201: `{ success:true, message:"signup_teacher_success", data:{ id, email } }`

## Superadmin
Base: `/superadmin` (requires Authorization: Bearer <superadmin-jwt>)

- GET `/schools` → all (not deleted)
- GET `/schools/verified` → verified only
- GET `/schools/unverified` → unverified only
- POST `/schools` → create school (same as signup flow)
  - Body: `{ name,email,phone,password,state?,city?,country?,address?,latitude?,longitude? }`
- PATCH `/schools/:id` → update subset of fields
- POST `/schools/:id/verify` → `{ verified: true|false }`
- DELETE `/schools/:id` → soft delete

## Codes and verification
- `school_code`: `ABC-1234` generated from school initials + 4 digits.
- `parent_code`: `ABC-PT-JD-1234` (e.g., `PH-PT-PO-0001`).
- `teacher_code`: `ABC-TE-JD-1234`.
- `driver_code`: `ABC-DRV-1234` (e.g., `PH-DRV-8349`).
- `bus_code`: `ABC-BUS-1234` (e.g., `PH-BUS-9283`).
- Codes are reserved in a global registry to ensure uniqueness.
- Login requires `users.email_verified` and the profile `verified` (for admin/parent/teacher/driver).

## Parents (School admin)
Base: `/schools/parents` (requires Authorization: Bearer <admin-jwt>)

When a school (admin user) creates a parent via these endpoints the parent is automatically verified and the parent's user record will have `email_verified = true`.

- POST `/schools/parents`
  - Description: Create a parent account as the school. The backend will create the `users` and `parents` records in a transaction, mark both `users.email_verified` and `parents.verified` as true.
  - Body:
    ```json
    {
      "fullname": "Jane Doe",
      "phonenumber": "+2348012345678",
      "nin": "12345678901",       
      "relationship": "Mother",
      "email": "parent@example.com",
      "password": "secret123"
    }
    ```
  - Response 201: `{ success:true, message:"parent_created", data:{ id: "<user-id>", email: "parent@example.com", fullname: "Jane Doe" } }`

- PATCH `/schools/parents/:parentId`
  - Description: Update parent profile (school admin only). Only parent fields (fullname, phonenumber, nin, relationship, address) can be updated here.
  - Body (any subset):
    ```json
    { "fullname": "Jane Doe", "phonenumber": "+234...", "address": "..." }
    ```
  - Response 200: `{ success:true, message:"parent_updated" }`

- DELETE `/schools/parents/:parentId`
  - Description: Soft-delete a parent (set `deleted_at`). School admin only.
  - Response 200: `{ success:true, message:"parent_deleted" }`

- GET `/schools/parents?filter=all|verified|unverified`
  - Description: List parents for the authenticated admin's school. `filter` is optional (defaults to `all`).
  - Response 200: `{ success:true, message:"parents_list", data: [ { id, user_id, parent_code, fullname, phone_number, nin, relationship, verified, created_at, updated_at, user_name, user_username, user_email, user_email_verified }, ... ] }`

- POST `/schools/parents/:parentId/verify`
  - Description: Verify a parent profile (enables login). School admin only. Only works if the parent belongs to your school.
  - Response 200: `{ success:true, message:"parent_verified" }`

- POST `/schools/parents/:parentId/students`
  - Description: Create a student under a specific parent in your school.
  - Body:
    ```json
    { "name": "John Doe", "reg_no": "STU-001", "class_id": "<uuid|null>" }
    ```
  - 201: `{ success:true, message:"student_created", data:{ id, name, reg_no, class_id, parent_id } }`

## Students (School admin)
Base: `/schools/students` (requires Authorization: Bearer <admin-jwt>)

- POST `/schools/students`
  - Description: Create a student. `name` is required; `reg_no`, `class_id`, and `parent_id` (parent's user id) are optional.
  - Body:
    ```json
    { "name": "John Doe", "reg_no": "STU-001", "class_id": "<uuid|null>", "parent_id": "<parent-user-id|null>" }
    ```
  - 201: `{ success:true, message:"student_created", data:{ id, name, reg_no, class_id, parent_id } }`

- POST `/schools/students/bulk` (multipart/form-data)
  - Description: Bulk create students from CSV/XLSX. Use file field name `file`.
  - File content expectations:
    - CSV: two columns per row: `name,reg_no`. Header row optional. Empty lines ignored.
    - XLSX: first sheet, columns A=name, B=reg_no. Header row optional.
  - 201: `{ success:true, message:"students_bulk_created", data:{ inserted: <count> } }`

- GET `/schools/students?class_id=<uuid>`
  - Description: List students in the authenticated admin's school.
  - Optional query `class_id` filters students by class.

- PATCH `/schools/students/:studentId`
  - Description: Update any subset of `name`, `reg_no`, `class_id`, `parent_id`.
  - 200: `{ success:true, message:"student_updated" }`

- DELETE `/schools/students/:studentId`
  - Description: Soft delete a student.
  - 200: `{ success:true, message:"student_deleted" }`

- GET `/schools/students/:studentId`
  - Description: Get a student's details plus parent info. Future extras (attendance, tracking) may be included later.
  - 200 example:
    ```json
    {
      "success": true,
      "message": "student_details",
      "data": {
        "id": "...",
        "school_id": "...",
        "name": "John Doe",
        "reg_no": "STU-001",
        "class_id": "...",
        "parent_id": "<parent-user-id>",
        "parent_profile_id": "<parents.id>",
        "parent_code": "PH-PT-PO-0001",
        "parent_fullname": "Jane Doe",
        "parent_phone_number": "+234...",
        "parent_email": "parent@example.com",
        "parent_user_name": "Jane Doe"
      }
    }
    ```

## Students (Parent self-service)
Base: `/parents/students` (requires Authorization: Bearer <parent-jwt>)

- POST `/parents/students`
  - Create a student under the logged-in parent. Uses the parent's `school_id` from profile automatically.
  - Body:
    ```json
    { "name": "Jane Jr.", "reg_no": "REG-1", "class_id": "<uuid|null>" }
    ```
  - 201: `{ success:true, message:"student_created", data:{ id, name, reg_no, class_id, parent_id } }`

- GET `/parents/students`
  - List all students belonging to the logged-in parent.

- PATCH `/parents/students/:studentId`
  - Update `name`, `reg_no`, `class_id` of own student.

- DELETE `/parents/students/:studentId`
  - Soft delete own student.

## Buses (School admin)
Base: `/schools/buses` (requires Authorization: Bearer <admin-jwt>)

- POST `/schools/buses`
  - Description: Create a bus for the school. Generates a unique bus `code` like `PH-BUS-0001`.
  - Body:
    ```json
    { "name": "Bus A", "plate_number": "AAA-123" }
    ```
  - 201:
    ```json
    {
      "success": true,
      "message": "bus_created",
      "data": { "id": "...", "name": "Bus A", "plate_number": "AAA-123", "code": "PH-BUS-1234" }
    }
    ```

- GET `/schools/buses`
  - Description: List buses for the authenticated admin's school.
  - 200:
    ```json
    {
      "success": true,
      "message": "buses_list",
      "data": [
        { "id": "...", "name": "Bus A", "plate_number": "AAA-123", "code": "PH-BUS-1234", "school_id": "...", "created_at": "...", "updated_at": "..." }
      ]
    }
    ```

- GET `/schools/buses/:busId`
  - Description: Get a single bus by id.
  - 200:
    ```json
    {
      "success": true,
      "message": "bus_details",
      "data": { "id": "...", "name": "Bus A", "plate_number": "AAA-123", "code": "PH-BUS-1234", "school_id": "...", "created_at": "...", "updated_at": "..." }
    }
    ```

- PATCH `/schools/buses/:busId`
  - Description: Update `name`, `plate_number`.
  - Body (any subset):
    ```json
    { "name": "Bus A (updated)" }
    ```
  - 200:
    ```json
    { "success": true, "message": "bus_updated" }
    ```

- DELETE `/schools/buses/:busId`
  - Description: Soft delete a bus.
  - 200:
    ```json
    { "success": true, "message": "bus_deleted" }
    ```

## Drivers (School admin)
Base: `/schools/drivers` (requires Authorization: Bearer <admin-jwt>)

Note: Drivers are users but do not log in. Creating a driver creates a `users` row (role `driver`) with a random password, then a `drivers` row with a unique code.

- POST `/schools/drivers`
  - Description: Create a driver user and driver profile with a unique `code` like `PH-DRV-0001`.
  - Body:
    ```json
    { "name": "John Driver", "email": "jd@example.com", "phone": "+234..." }
    ```
  - 201:
    ```json
    {
      "success": true,
      "message": "driver_created",
      "data": { "id": "<user-id>", "email": "jd@example.com", "code": "PH-DRV-0001", "user_id": "<user-id>", "school_id": "..." }
    }
    ```

- GET `/schools/drivers`
  - Description: List drivers for the authenticated admin's school.
  - 200:
    ```json
    {
      "success": true,
      "message": "drivers_list",
      "data": [ { "id": "...", "user_id": "...", "school_id": "...", "code": "PH-DRV-0001", "name": "John Driver", "phone": "+234..." } ]
    }
    ```

- GET `/schools/drivers/:driverId`
  - Description: Get a single driver by id.
  - 200:
    ```json
    {
      "success": true,
      "message": "driver_details",
      "data": { "id": "...", "user_id": "...", "school_id": "...", "code": "PH-DRV-0001", "name": "John Driver", "phone": "+234..." }
    }
    ```

- PATCH `/schools/drivers/:driverId`
  - Description: Update `name`, `phone`.
  - Body (any subset):
    ```json
    { "phone": "+234111222333" }
    ```
  - 200:
    ```json
    { "success": true, "message": "driver_updated" }
    ```

- DELETE `/schools/drivers/:driverId`
  - Description: Soft delete a driver.
  - 200:
    ```json
    { "success": true, "message": "driver_deleted" }
    ```

## Teachers (School admin)
Base: `/schools/teachers` (requires Authorization: Bearer <admin-jwt>)

Note: Teachers are users. If the school creates them here, the teacher profile is marked `verified` and the user `email_verified = true` automatically. If teachers self-sign up via `/auth/signup/teacher`, they follow the usual OTP verification flow and are not auto-verified.

- POST `/schools/teachers`
  - Description: Create a teacher (user + teacher profile) with a unique code like `PH-TE-JD-0001`. Auto-verifies profile and email.
  - Body:
    ```json
    {
      "name": "Jane Teacher",
      "email": "jt@example.com",
      "password": "secret123",
      "gender": "female",
      "nin": "12345678901",
      "dob": "1990-06-01",
      "nationality": "NG",
      "state_of_origin": "Lagos",
      "phone": "+2348012345678"
    }
    ```
  - 201:
    ```json
    {
      "success": true,
      "message": "teacher_created",
      "data": {
        "id": "<user-id>",
        "email": "jt@example.com",
        "teacher_code": "PH-TE-JT-0001",
        "user_id": "<user-id>",
        "school_id": "...",
        "name": "Jane Teacher",
        "nin": "12345678901",
        "gender": "female",
        "dob": "1990-06-01",
        "nationality": "NG",
        "state_of_origin": "Lagos",
        "phone": "+2348012345678",
        "passport_photo_url": null,
        "verified": true
      }
    }
    ```

- GET `/schools/teachers`
  - Description: List teachers for the authenticated admin's school.
  - 200:
    ```json
    {
      "success": true,
      "message": "teachers_list",
      "data": [ { "id": "...", "user_id": "...", "school_id": "...", "teacher_code": "PH-TE-JT-0001", "name": "Jane Teacher", "gender": "female", "phone": "+234...", "verified": true } ]
    }
    ```

- GET `/schools/teachers/:teacherId`
  - Description: Get a single teacher by id.
  - 200:
    ```json
    {
      "success": true,
      "message": "teacher_details",
      "data": { "id": "...", "user_id": "...", "school_id": "...", "teacher_code": "PH-TE-JT-0001", "name": "Jane Teacher", "gender": "female", "phone": "+234...", "verified": true }
    }
    ```

- PATCH `/schools/teachers/:teacherId`
  - Description: Update teacher fields (`name`, `nin`, `gender`, `dob`, `nationality`, `state_of_origin`, `phone`).
  - Body (any subset):
    ```json
    { "phone": "+234111222333" }
    ```
  - 200:
    ```json
    { "success": true, "message": "teacher_updated" }
    ```

- DELETE `/schools/teachers/:teacherId`
  - Description: Soft delete a teacher.
  - 200:
    ```json
    { "success": true, "message": "teacher_deleted" }
    ```

- POST `/schools/teachers/:teacherId/verify`
  - Description: Verify a teacher profile (for teachers who signed up and verified email via OTP). School admin only, scoped to own school.
  - 200:
    ```json
    { "success": true, "message": "teacher_verified" }
    ```

## Relationships and Enriched Details

### Enriched detail responses

- GET `/schools/buses/:busId`
  - Returns bus with driver and students on the bus.
  - Example:
    ```json
    {
      "success": true,
      "message": "bus_details",
      "data": {
        "id": "...",
        "school_id": "...",
        "name": "Bus A",
        "plate_number": "AAA-123",
        "code": "PH-BUS-1234",
        "created_at": "...",
        "updated_at": "...",
        "driver": { "id": "...", "user_id": "...", "code": "PH-DRV-0001", "name": "John Driver", "phone": "+234..." },
        "students": [ { "id": "...", "name": "John Doe", "reg_no": "STU-001", "class_id": "...", "parent_id": "..." } ]
      }
    }
    ```

- GET `/schools/drivers/:driverId`
  - Returns driver with assigned bus and students on that bus.
  - Example:
    ```json
    {
      "success": true,
      "message": "driver_details",
      "data": {
        "id": "...",
        "user_id": "...",
        "school_id": "...",
        "code": "PH-DRV-0001",
        "name": "John Driver",
        "phone": "+234...",
        "bus": { "id": "...", "name": "Bus A", "plate_number": "AAA-123", "code": "PH-BUS-1234" },
        "students": [ { "id": "...", "name": "John Doe", "reg_no": "STU-001", "class_id": "...", "parent_id": "..." } ]
      }
    }
    ```

- GET `/schools/teachers/:teacherId`
  - Returns teacher with their class and students in that class.
  - Example:
    ```json
    {
      "success": true,
      "message": "teacher_details",
      "data": {
        "id": "...",
        "user_id": "...",
        "school_id": "...",
        "teacher_code": "PH-TE-JT-0001",
        "name": "Jane Teacher",
        "gender": "female",
        "phone": "+234...",
        "verified": true,
        "class": { "id": "...", "name": "JS1", "code": "JS1-A" },
        "students": [ { "id": "...", "name": "John Doe", "reg_no": "STU-001", "class_id": "...", "parent_id": "..." } ]
      }
    }
    ```

### Relationship endpoints

All endpoints require Authorization: Bearer <admin-jwt> and are scoped to the authenticated school.

- Assign/unassign driver ⇄ bus
  - POST `/schools/drivers/:driverId/bus` → `{ "bus_id": "<uuid>" }`
  - DELETE `/schools/drivers/:driverId/bus`

- Assign/unassign teacher ⇄ class
  - POST `/schools/teachers/:teacherId/class` → `{ "class_id": "<uuid>" }`
  - DELETE `/schools/teachers/:teacherId/class`

- Assign/unassign students ⇒ bus (bulk)
  - POST `/schools/students/assign/bus` → `{ "bus_id": "<uuid>", "student_ids": ["<uuid>","<uuid>"] }`
  - POST `/schools/students/unassign/bus` → `{ "student_ids": ["<uuid>","<uuid>"] }`

- Assign/unassign students ⇒ class (bulk)
  - POST `/schools/students/assign/class` → `{ "class_id": "<uuid>", "student_ids": ["<uuid>","<uuid>"] }`
  - POST `/schools/students/unassign/class` → `{ "student_ids": ["<uuid>","<uuid>"] }`

## Attendance

Base: `/attendance` (requires Authorization: Bearer <jwt>)

### Concepts
- Two types:
  - `school_attendance`: taken by admins or teachers for school/class context.
  - `bus_attendance`: taken by admins or drivers for bus context.
- Status enum: `present | absent | late`.
- Idempotent per student per date (upsert).

### Write attendance

- POST `/attendance/school`
  - Roles: `superadmin`, `admin`, `teacher`.
  - Body:
    ```json
    {
      "entries": [
        { "student_id": "<uuid>", "status": "present", "note": "", "date": "2025-01-20" }
      ],
      "school_id": "<uuid|null>" // required only for superadmin
    }
    ```
  - Scope rules:
    - superadmin: must include `school_id`.
    - admin: auto-scoped to own school.
    - teacher: auto-scoped to own school and their assigned class; only students in their class can be recorded.
  - 201: `{ success:true, message:"school_attendance_recorded", data:{ upserted: <count> } }`

- POST `/attendance/bus`
  - Roles: `superadmin`, `admin`, `driver`.
  - Body:
    ```json
    {
      "entries": [
        { "student_id": "<uuid>", "status": "present", "note": "", "date": "2025-01-20" }
      ],
      "school_id": "<uuid|null>", // required only for superadmin
      "bus_id": "<uuid|null>"     // optional for superadmin/admin; drivers use their assigned bus automatically
    }
    ```
  - Scope rules:
    - superadmin: can specify any `school_id`/`bus_id`.
    - admin: auto-scoped to own school; can optionally specify `bus_id`.
    - driver: auto-scoped to own school and own assigned bus; only students on that bus can be recorded.
  - 201: `{ success:true, message:"bus_attendance_recorded", data:{ upserted: <count> } }`

### Read attendance

- GET `/attendance/school?date=YYYY-MM-DD&class_id=<uuid>&student_id=<uuid>&school_id=<uuid>`
  - Roles: all (`superadmin`, `admin`, `teacher`, `driver`, `parent`).
  - Scope rules:
    - superadmin: may filter by `school_id`.
    - admin: auto-scoped to own school.
    - teacher: auto-scoped to own school and their class.
    - driver: auto-scoped to students on their bus (via `student_buses`) when reading school attendance.
    - parent: auto-scoped to their own child(ren) only.
  - 200: `{ success:true, message:"school_attendance_list", data:[ { id, school_id, student_id, class_id, status, note, attendance_date, taken_at, taken_by_user_id, taken_by_role } ] }`

- GET `/attendance/bus?date=YYYY-MM-DD&bus_id=<uuid>&student_id=<uuid>&school_id=<uuid>`
  - Roles: all (`superadmin`, `admin`, `teacher`, `driver`, `parent`).
  - Scope rules:
    - superadmin: may filter by `school_id`/`bus_id`.
    - admin: auto-scoped to own school; may filter by `bus_id`.
    - teacher: auto-scoped to students in their class.
    - driver: auto-scoped to their assigned bus only.
    - parent: auto-scoped to their own child(ren) only.
  - 200: `{ success:true, message:"bus_attendance_list", data:[ { id, school_id, student_id, bus_id, status, note, attendance_date, taken_at, taken_by_user_id, taken_by_role } ] }`

### Notes
- Writes are idempotent per student per date; subsequent writes update status/note.
- Parent role has read-only access; cannot write attendance.
- All endpoints enforce school scoping and role constraints at query level.

### Per-role access

Below summarizes what each role can do and the exact endpoints they should call.

#### Superadmin
- Write school attendance
  - POST `/attendance/school`
  - Body:
    ```json
    {
      "school_id": "<uuid>",
      "entries": [ { "student_id": "<uuid>", "status": "present", "date": "YYYY-MM-DD", "note": "" } ]
    }
    ```
- Write bus attendance
  - POST `/attendance/bus`
  - Body:
    ```json
    {
      "school_id": "<uuid>",
      "bus_id": "<uuid>",
      "entries": [ { "student_id": "<uuid>", "status": "present", "date": "YYYY-MM-DD", "note": "" } ]
    }
    ```
- Read
  - GET `/attendance/school?school_id=<uuid>&date=YYYY-MM-DD&class_id=<uuid>&student_id=<uuid>`
  - GET `/attendance/bus?school_id=<uuid>&bus_id=<uuid>&date=YYYY-MM-DD&student_id=<uuid>`

#### Admin (School)
- Write school attendance
  - POST `/attendance/school`
  - Body (school auto-scoped):
    ```json
    { "entries": [ { "student_id": "<uuid>", "status": "present", "date": "YYYY-MM-DD" } ] }
    ```
- Write bus attendance
  - POST `/attendance/bus`
  - Body (school auto-scoped; `bus_id` optional):
    ```json
    { "bus_id": "<uuid>", "entries": [ { "student_id": "<uuid>", "status": "absent", "date": "YYYY-MM-DD" } ] }
    ```
- Read
  - GET `/attendance/school?date=YYYY-MM-DD&class_id=<uuid>&student_id=<uuid>`
  - GET `/attendance/bus?date=YYYY-MM-DD&bus_id=<uuid>&student_id=<uuid>`

#### Teacher
- Write school attendance (only for their assigned class)
  - POST `/attendance/school`
  - Body:
    ```json
    { "entries": [ { "student_id": "<uuid>", "status": "late", "date": "YYYY-MM-DD" } ] }
    ```
- Read (scoped to their class)
  - GET `/attendance/school?date=YYYY-MM-DD&student_id=<uuid>`
  - GET `/attendance/bus?date=YYYY-MM-DD&student_id=<uuid>`

#### Driver
- Write bus attendance (only for their assigned bus)
  - POST `/attendance/bus`
  - Body:
    ```json
    { "entries": [ { "student_id": "<uuid>", "status": "present", "date": "YYYY-MM-DD" } ] }
    ```
- Read (scoped to their bus)
  - GET `/attendance/bus?date=YYYY-MM-DD&student_id=<uuid>`
  - GET `/attendance/school?date=YYYY-MM-DD&student_id=<uuid>`

#### Parent
- Read only (their child/children)
  - GET `/attendance/school?date=YYYY-MM-DD&student_id=<uuid>`
  - GET `/attendance/bus?date=YYYY-MM-DD&student_id=<uuid>`

## Development
## Tracking

Base: `/tracking` (requires Authorization: Bearer <jwt>)

### Concepts
- Driver phone provides the live bus GPS.
- Fixed points: school (from school profile) and parent homes (from parents profile lat/lng).
- Trip directions: `pickup` (homes → school) and `dropoff` (school → homes).
- One driver per bus; exactly one running trip per bus at a time.
- Targets (students) are auto-seeded at trip start and can be marked as `picked`/`dropped` by the driver. Marked targets disappear from the driver’s map.
- Parents see school + bus + their home; teachers/admin see school buses for their scope; superadmin can see any school.

### Configuration (per school with sensible defaults)
- Ping interval (seconds): default 10s (column: `schools.tracking_ping_secs`).
- Geofence radii: defaults, configurable per school
  - School radius: default 150m (column: `schools.tracking_school_geofence_m`).
  - Home radius: default 75m (column: `schools.tracking_home_geofence_m`).
- Stop ordering: nearest-neighbor ordering at trip start (from driver’s start location). Future improvements possible.

### Driver
- POST `/tracking/trips/start`
  - Body:
    ```json
    { "direction": "pickup", "route_name": "Morning Run" }
    ```
  - 201: `{ success:true, message:"trip_started", data:{ trip_id } }`

- POST `/tracking/trips/{tripId}/locations`
  - Body:
    ```json
    {
      "points": [
        { "lat": 6.45, "lng": 3.39, "recorded_at": "2025-11-26T07:00:01Z", "speed_kph": 24.2, "heading": 180 }
      ]
    }
    ```
  - Post every ~10s; batching supported.

- PATCH `/tracking/trips/{tripId}/targets/{targetId}`
  - Body: `{ "status": "picked" | "dropped" | "skipped" }`
  - Marks target; emits event; removes pin from driver’s map.

- POST `/tracking/trips/{tripId}/end`
  - Ends current trip (driver/admin/superadmin).

### Live views
- GET `/tracking/live`
  - Roles:
    - superadmin: `?school_id=<uuid>` required
    - admin/teacher/driver: auto-scoped to their school
  - Response: active trips with latest location, remaining targets count, bus info.

- GET `/tracking/live/mine` (parent)
  - Response: child’s bus current location + school location + parent home location.

### Roles summary
- **Driver**: start/end trip; post locations; mark targets; view live (school scope).
- **Admin**: live view for their school; end trip if necessary.
- **Teacher**: live view (school scope; class-only filtering can be added later).
- **Parent**: live mine only; sees bus + school + their home.
- **Superadmin**: live view for any school via `school_id` filter.

### Events and notifications
- Events tracked: `start`, `end`, `picked`, `dropped`, `geofence_enter/exit`, `sos`, etc.
- SOS notifications (push/email/sms) to all parties will be added later.

- Dev server: `npm run dev`
- Migrations: `npm run migrate`
- Seed superadmin:
  - `SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run seed:superadmin`
  - Or: `npx tsx src/scripts/seed_superadmin.ts <email> <password>`
