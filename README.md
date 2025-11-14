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

## Development
- Dev server: `npm run dev`
- Migrations: `npm run migrate`
- Seed superadmin:
  - `SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run seed:superadmin`
  - Or: `npx tsx src/scripts/seed_superadmin.ts <email> <password>`