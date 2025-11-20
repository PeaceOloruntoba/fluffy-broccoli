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
- `parent_code`: `PA-ABC-JD-1234`; `teacher_code`: `TE-ABC-JD-1234`.
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
  - Response 200: `{ success:true, message:"parents_list", data: [ { id, user_id, parent_code, fullname, phone_number, nin, relationship, verified, created_at, updated_at }, ... ] }`

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

- GET `/schools/students`
  - Description: List students in the authenticated admin's school.

- PATCH `/schools/students/:studentId`
  - Description: Update any subset of `name`, `reg_no`, `class_id`, `parent_id`.
  - 200: `{ success:true, message:"student_updated" }`

- DELETE `/schools/students/:studentId`
  - Description: Soft delete a student.
  - 200: `{ success:true, message:"student_deleted" }`

## Development
- Dev server: `npm run dev`
- Migrations: `npm run migrate`
- Seed superadmin:
  - `SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run seed:superadmin`
  - Or: `npx tsx src/scripts/seed_superadmin.ts <email> <password>`