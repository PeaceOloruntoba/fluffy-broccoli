# MySchoolBus — API Documentation

Backend: Node.js + Express + TypeScript + PostgreSQL
Base URL: http://localhost:4000/api/v1
Authentication: Bearer <JWT>

Contents
- Auth (global)
- Public
- Health
- Superadmin
- Admin (School)
- Teachers
- Drivers
- Parents
- Notifications (module details)
- Attendance (module details)
- Tracking (module details)
- Environment

---

Conventions
- All IDs are UUID strings.
- Timestamps are ISO8601 in UTC.
- Responses follow `{ success, message, data }` shape.

# Auth (Global)
Base: `/auth`

- Login
  - POST `/auth/login`
  - Body:
    ```json
    { "identifier": "user@example.com", "password": "secret" }
    ```
  - 200:
    ```json
    { "success": true, "message": "login_success", "data": { "token": "<jwt>", "user": { "id": "...", "email": "...", "role": "parent", "email_verified": true }, "refresh_token": "<opaque>" } }
    ```
  - 401:
    ```json
    { "success": false, "message": "invalid_credentials" }
    ```

- Refresh (token-in-body)
  - POST `/auth/refresh`
  - Body:
    ```json
    { "refresh_token": "<opaque>" }
    ```
  - 200:
    ```json
    { "success": true, "message": "token_refreshed", "data": { "token": "<jwt>", "refresh_token": "<opaque>" } }
    ```

- Refresh (cookie-based, web)
  - POST `/auth/refresh-cookie`
  - Reads `refresh_token` from httpOnly cookie, rotates it.
  - 200:
    ```json
    { "success": true, "message": "token_refreshed", "data": { "token": "<jwt>" } }
    ```

- Logout (single device)
  - POST `/auth/logout`
  - Body:
    ```json
    { "refresh_token": "<opaque>" }
    ```
  - 200:
    ```json
    { "success": true, "message": "logout_success" }
    ```

- Logout (cookie-based)
  - POST `/auth/logout-cookie`
  - 200:
    ```json
    { "success": true, "message": "logout_success" }
    ```

- Logout all devices
  - POST `/auth/logout-all` (Authorization required)
  - 200:
    ```json
    { "success": true, "message": "logout_all_success" }
    ```

- Forgot / Reset Password
  - POST `/auth/forgot-password`
    - Body:
      ```json
      { "email": "user@example.com" }
      ```
    - 200:
      ```json
      { "success": true, "message": "otp_sent" }
      ```
  - POST `/auth/reset-password`
    - Body:
      ```json
      { "email":"user@example.com","code":"123456","newPassword":"newpass" }
      ```
    - 200:
      ```json
      { "success": true, "message": "password_reset_success" }
      ```

- Email Verification
  - POST `/auth/verify-email`
    - Body:
      ```json
      { "email":"user@example.com","code":"123456" }
      ```
    - 200:
      ```json
      { "success": true, "message": "email_verified" }
      ```
  - POST `/auth/resend-email-verification`
    - Body:
      ```json
      { "email":"user@example.com" }
      ```
    - 200:
      ```json
      { "success": true, "message": "otp_resent" }
      ```

- Signups (Transactional)
  - POST `/auth/signup/school` (multipart/form-data)
    - Fields: `name,email,phone,password,latitude?,longitude?`
    - File: `logo` (optional)
    - 201:
      ```json
      { "success": true, "message": "signup_school_success", "data": { "id": "<uuid>", "email": "admin@school.com" } }
      ```
  - POST `/auth/signup/parent`
    - Body:
      ```json
      { "fullname":"Jane Doe","phonenumber":"+234...","nin":"...","relationship":"Mother","school_id":"<uuid>","email":"parent@example.com","password":"secret","latitude":6.45,"longitude":3.39 }
      ```
    - 201:
      ```json
      { "success": true, "message": "signup_parent_success", "data": { "id": "<uuid>", "email": "parent@example.com" } }
      ```
  - POST `/auth/signup/teacher` (multipart/form-data)
    - Fields: `name,nin?,gender,dob?,nationality?,state_of_origin?,email,phone?,school_id,password`
    - File: `passport` (optional)
    - 201:
      ```json
      { "success": true, "message": "signup_teacher_success", "data": { "id": "<uuid>", "email": "teacher@example.com" } }
      ```

Notes
- Access tokens: `JWT_ACCESS_EXPIRES` (e.g., 15m)
- Refresh tokens: 30 days, rotated on refresh
- Cookie attributes: httpOnly, sameSite=lax, path=/auth, secure in production

---

# Public

- List schools (minimal)
  - GET `/public/schools`
  - 200:
    ```json
    { "success": true, "message": "schools_list", "data": [ { "id": "<uuid>", "school_code": "PH-0001", "name": "Sample School" } ] }
    ```

---

# Health

- Service health
  - GET `/health`
  - 200:
    ```json
    { "success": true, "message": "healthy", "data": { "uptime": 123.45, "db": "up" } }
    ```
  - 503:
    ```json
    { "success": false, "message": "unhealthy", "data": { "uptime": 123.45, "db": "down" } }
    ```

---

# Superadmin

Modules: System, Schools Management, Tracking (view), Notifications, Attendance (read/write)

- System
  - GET `/health`
  - 200/503 as above.

- Schools Management (Base: `/superadmin`)
  - List all schools
    - GET `/superadmin/schools`
    - 200:
      ```json
      { "success": true, "message": "schools_list", "data": [ { "id": "<uuid>", "name": "...", "school_code": "PH-0001", "verified": true } ] }
      ```
  - List verified schools
    - GET `/superadmin/schools/verified`
  - List unverified schools
    - GET `/superadmin/schools/unverified`
  - Create school (same as signup flow, transactional)
    - POST `/superadmin/schools`
    - Body:
      ```json
      { "name":"School Name", "email":"admin@school.com", "phone":"+234...", "password":"secret", "latitude": 6.45, "longitude": 3.39 }
      ```
    - 201:
      ```json
      { "success": true, "message": "school_created", "data": { "id": "<uuid>", "email": "admin@school.com" } }
      ```
  - Update school
    - PATCH `/superadmin/schools/:id`
    - Body (any subset):
      ```json
      { "name": "Updated School", "phone": "+234...", "latitude": 6.46, "longitude": 3.40 }
      ```
    - 200: `{ "success": true, "message": "school_updated" }`
  - Verify/unverify school
    - POST `/superadmin/schools/:id/verify`
    - Body:
      ```json
      { "verified": true }
      ```
    - 200: `{ "success": true, "message": "school_verified" }`
  - Delete school (soft delete)
    - DELETE `/superadmin/schools/:id`
    - 200: `{ "success": true, "message": "school_deleted" }`

- Tracking (view)
  - Live by school
    - GET `/tracking/live?school_id=<uuid>`
    - 200:
      ```json
      [ { "trip_id": "<uuid>", "bus_id": "<uuid>", "direction": "pickup", "lat": 6.45, "lng": 3.39, "recorded_at": "...", "bus_name": "Bus A", "remaining_pending": 5 } ]
      ```

- Notifications (in-app)
  - GET `/notifications`
  - POST `/notifications/:id/read`
  - POST `/notifications/read-all`
  - GET `/notifications/preferences`
  - PUT `/notifications/preferences`

- Attendance
  - Write school attendance
    - POST `/attendance/school`
    - Body:
      ```json
      { "school_id": "<uuid>", "entries": [ { "student_id": "<uuid>", "status": "present", "date": "YYYY-MM-DD", "note": "" } ] }
      ```
    - 201: `{ "success": true, "message": "school_attendance_recorded", "data": { "upserted": 1 } }`
  - Write bus attendance
    - POST `/attendance/bus`
    - Body:
      ```json
      { "school_id": "<uuid>", "bus_id": "<uuid>", "entries": [ { "student_id": "<uuid>", "status": "present", "date": "YYYY-MM-DD" } ] }
      ```
    - 201: `{ "success": true, "message": "bus_attendance_recorded", "data": { "upserted": 1 } }`
  - Read
    - GET `/attendance/school?school_id=<uuid>&date=YYYY-MM-DD&class_id=<uuid>&student_id=<uuid>`
    - GET `/attendance/bus?school_id=<uuid>&bus_id=<uuid>&date=YYYY-MM-DD&student_id=<uuid>`

---

# Teachers

Modules: Tracking (view), Attendance, Notifications

- Tracking (view)
  - GET `/tracking/live`
  - 200:
    ```json
    [ { "trip_id": "<uuid>", "bus_id": "<uuid>", "direction": "dropoff", "lat": 6.45, "lng": 3.39, "recorded_at": "...", "bus_name": "Bus A" } ]
    ```

- Attendance
  - Write school attendance (for assigned class only)
    - POST `/attendance/school`
      ```json
      { "entries": [ { "student_id": "<uuid>", "status": "late", "date": "YYYY-MM-DD" } ] }
      ```
      201: `{ "success": true, "message": "school_attendance_recorded", "data": { "upserted": 1 } }`
  - Read school attendance (class scope)
    - GET `/attendance/school?date=YYYY-MM-DD&student_id=<uuid>`

- Students (my class)
  - GET `/schools/teachers/me/students`
  - 200:
    ```json
    { "success": true, "message": "teacher_students", "data": { "class": { "id": "<uuid>", "name": "Primary 3", "code": "P3" }, "students": [ { "id": "<uuid>", "name": "John Doe", "reg_no": "STU-001", "class_id": "<uuid>", "parent_id": "<user-id>" } ] } }
    ```
  - 404:
    ```json
    { "success": false, "message": "teacher_not_found_or_no_class" }
    ```

- Notifications
  - GET `/notifications`
  - POST `/notifications/:id/read`
  - POST `/notifications/read-all`
  - Device tokens (push)
    - POST `/notifications/devices/register`
      ```json
      { "token": "<fcm>", "platform": "android" }
      ```
    - POST `/notifications/devices/unregister`
      ```json
      { "token": "<fcm>" }
      ```
  - Preferences
    - GET `/notifications/preferences`
    - PUT `/notifications/preferences`

---

# Parents

Modules: Tracking (mine), Notifications, Reminders

- Tracking (Mine)
  - GET `/tracking/live/mine`
  - 200:
    ```json
    { "success": true, "message": "live_mine", "data": { "trip_id": "<uuid>", "direction": "pickup", "lat": 6.4512, "lng": 3.3901, "recorded_at": "2025-11-27T07:30:00Z", "school_lat": 6.4700, "school_lng": 3.4000, "home_lat": 6.4400, "home_lng": 3.3800 } }
    ```

- Notifications (in-app)
  - GET `/notifications`
    - Optional query: `is_read=true|false`, `cursor=<id>`, `limit=20`
    - 200:
      ```json
      { "success": true, "message": "notifications_list", "data": [ { "id": "<uuid>", "title": "Trip started (Pickup)", "body": "Trip started for bus Bus A", "type": "trip.start", "category": "trip", "data": { "trip_id": "<uuid>" }, "is_read": false, "created_at": "2025-11-27T07:30:00Z" } ] }
      ```
  - POST `/notifications/:id/read` → `{ "success": true, "message": "notification_read" }`
  - POST `/notifications/read-all` → `{ "success": true, "message": "notifications_read_all" }`

- Reminders (distance-based)
  - GET `/notifications/reminders`
    - 200:
      ```json
      { "success": true, "message": "parent_reminders", "data": [ { "id": "<uuid>", "student_id": "<uuid>", "school_id": "<uuid>", "enabled": true, "pickup_radius_km": 5, "dropoff_radius_km": 10, "created_at": "...", "updated_at": "..." } ] }
      ```
  - PUT `/notifications/reminders`
    - Body:
      ```json
      { "student_id": "<uuid>", "school_id": "<uuid>", "enabled": true, "pickup_radius_km": 5, "dropoff_radius_km": 10 }
      ```
    - 200:
      ```json
      { "success": true, "message": "parent_reminder_updated", "data": { "id": "<uuid>", "student_id": "<uuid>", "enabled": true, "pickup_radius_km": 5, "dropoff_radius_km": 10 } }
      ```

- Students (self-service)
  - Create student
    - POST `/parents/students`
      ```json
      { "name": "Jane Jr.", "reg_no": "REG-1", "class_id": "<uuid|null>" }
      ```
      201: `{ "success": true, "message": "student_created", "data": { "id": "<uuid>", "name": "Jane Jr.", "reg_no": "REG-1", "class_id": null, "parent_id": "<uuid>" } }`
  - List my students
    - GET `/parents/students`
  - Update student
    - PATCH `/parents/students/:studentId`
      ```json
      { "name": "Updated Name", "reg_no": "REG-2", "class_id": "<uuid|null>" }
      ```
      200: `{ "success": true, "message": "student_updated" }`
  - Delete student
    - DELETE `/parents/students/:studentId`
      200: `{ "success": true, "message": "student_deleted" }`

- Notifications (push setup)
  - POST `/notifications/devices/register`
    ```json
    { "token": "<fcm>", "platform": "android" }
    ```
  - POST `/notifications/devices/unregister`
    ```json
    { "token": "<fcm>" }
    ```

---

# Drivers

Modules: Tracking, Notifications

- Start trip
  - POST `/tracking/trips/start`
  - Body:
    ```json
    { "direction": "pickup", "route_name": "Morning Route" }
    ```
  - 200:
    ```json
    { "success": true, "message": "trip_started", "data": { "trip_id": "<uuid>", "targets": [ { "target_id": "<uuid>", "student_id": "<uuid>", "name": "John Doe", "lat": 6.44, "lng": 3.38, "order_index": 1 } ] } }
    ```

- Add locations (every ~10s; batching allowed)
  - POST `/tracking/trips/:tripId/locations`
  - Body:
    ```json
    { "points": [ { "lat": 6.4512, "lng": 3.3901, "recorded_at": "2025-11-27T07:30:00Z", "speed_kph": 24.2, "heading": 180, "accuracy_m": 5.0 } ] }
    ```
  - 200:
    ```json
    { "success": true, "message": "locations_added", "data": { "inserted": 1 } }
    ```

- Update target status
  - PATCH `/tracking/trips/:tripId/targets/:targetId`
  - Body:
    ```json
    { "status": "picked" }
    ```
  - 200:
    ```json
    { "success": true, "message": "target_updated", "data": { "updated": true } }
    ```

- End trip
  - POST `/tracking/trips/:tripId/end`
  - 200:
    ```json
    { "success": true, "message": "trip_ended", "data": { "ended": true } }
    ```

- Notifications (in-app)
  - GET `/notifications`
  - POST `/notifications/:id/read`
  - POST `/notifications/read-all`


---

# Admin (School)

Modules: Tracking, Attendance, Parents, Students, Drivers/Buses, Teachers/Classes, Notifications

- Tracking
  - Live (school-wide)
    - GET `/tracking/live`
    - 200:
      ```json
      [ { "trip_id": "<uuid>", "bus_id": "<uuid>", "direction": "pickup", "lat": 6.45, "lng": 3.39, "recorded_at": "...", "bus_name": "Bus A", "remaining_pending": 5 } ]
      ```

- Attendance
  - Write school attendance
    - POST `/attendance/school`
      ```json
      { "entries": [ { "student_id": "<uuid>", "status": "present", "date": "YYYY-MM-DD", "note": "" } ] }
      ```
      201: `{ "success": true, "message": "school_attendance_recorded", "data": { "upserted": 1 } }`
  - Read school attendance
    - GET `/attendance/school?date=YYYY-MM-DD&class_id=<uuid>&student_id=<uuid>`
  - Write bus attendance
    - POST `/attendance/bus`
      ```json
      { "bus_id": "<uuid>", "entries": [ { "student_id": "<uuid>", "status": "picked", "date": "YYYY-MM-DD" } ] }
      ```
      201: `{ "success": true, "message": "bus_attendance_recorded", "data": { "upserted": 1 } }`
  - Read bus attendance
    - GET `/attendance/bus?date=YYYY-MM-DD&bus_id=<uuid>&student_id=<uuid>`

- Parents
  - Create parent
    - POST `/schools/parents`
      ```json
      { "fullname":"Jane Doe","phonenumber":"+2348012345678","nin":"12345678901","relationship":"Mother","email":"parent@example.com","password":"secret" }
      ```
      201:
      ```json
      { "success": true, "message": "parent_created", "data": { "id": "<user-id>", "email": "parent@example.com" } }
      ```
  - List parents
    - GET `/schools/parents?filter=all|verified|unverified`
  - Update parent
    - PATCH `/schools/parents/:parentId`
      ```json
      { "fullname": "Jane A. Doe", "phonenumber": "+234..." }
      ```
      200: `{ "success": true, "message": "parent_updated" }`
  - Delete parent (soft)
    - DELETE `/schools/parents/:parentId`
      200: `{ "success": true, "message": "parent_deleted" }`
  - Create student under parent
    - POST `/schools/parents/:parentId/students`
      ```json
      { "name": "John Doe", "reg_no": "STU-001", "class_id": "<uuid|null>" }
      ```
      201: `{ "success": true, "message": "student_created", "data": { "id": "<uuid>", "name": "John Doe", "reg_no": "STU-001", "class_id": null, "parent_id": "<parent-user-id>" } }`

- Students
  - Create student (standalone)
    - POST `/schools/students`
      ```json
      { "name": "John Jr.", "reg_no": "STU-100", "class_id": "<uuid|null>", "parent_id": "<parent-user-id|null>" }
      ```
  - List students
    - GET `/schools/students?class_id=<uuid>`
  - Update student
    - PATCH `/schools/students/:studentId`
      ```json
      { "name": "Updated", "class_id": "<uuid|null>", "parent_id": "<parent-user-id|null>" }
      ```
      200: `{ "success": true, "message": "student_updated" }`
  - Delete student (soft)
    - DELETE `/schools/students/:studentId`
      200: `{ "success": true, "message": "student_deleted" }`
  - Get student details (with parent)
    - GET `/schools/students/:studentId`
      200 example includes parent fields per implementation.

- Drivers / Buses
  - Create driver
    - POST `/schools/drivers`
      ```json
      { "name": "John Driver", "email": "jd@example.com", "phone": "+234..." }
      ```
      201 returns created driver user/profile.
  - List / Get / Update / Delete drivers
    - GET `/schools/drivers` | GET `/schools/drivers/:driverId`
    - PATCH `/schools/drivers/:driverId` `{ "phone": "+234..." }` → 200 `{ "success": true, "message": "driver_updated" }`
    - DELETE `/schools/drivers/:driverId` → 200 `{ "success": true, "message": "driver_deleted" }`
  - Create bus
    - POST `/schools/buses`
      ```json
      { "name": "Bus A", "plate_number": "AAA-123" }
      ```
  - List / Get / Update / Delete buses
    - GET `/schools/buses` | GET `/schools/buses/:busId`
    - PATCH `/schools/buses/:busId` `{ "name": "Bus X" }` → 200 `{ "success": true, "message": "bus_updated" }`
    - DELETE `/schools/buses/:busId` → 200 `{ "success": true, "message": "bus_deleted" }`
  - Assign relationships
    - Assign driver to bus: POST `/schools/drivers/:driverId/bus` `{ "bus_id": "<uuid>" }`
    - Unassign driver from bus: DELETE `/schools/drivers/:driverId/bus`
    - Assign students to bus (bulk): POST `/schools/students/assign/bus` `{ "bus_id": "<uuid>", "student_ids": ["<uuid>"] }`
    - Unassign students from bus (bulk): POST `/schools/students/unassign/bus` `{ "student_ids": ["<uuid>"] }`

- Teachers / Classes
  - Create teacher
    - POST `/schools/teachers`
      ```json
      { "name": "Jane Teacher", "email": "jt@example.com", "password": "secret", "gender": "female", "nin": "12345678901", "phone": "+234..." }
      ```
  - List / Get / Update / Delete teachers
    - GET `/schools/teachers` | GET `/schools/teachers/:teacherId`
    - PATCH `/schools/teachers/:teacherId` `{ "phone": "+234..." }` → 200 `{ "success": true, "message": "teacher_updated" }`
    - DELETE `/schools/teachers/:teacherId` → 200 `{ "success": true, "message": "teacher_deleted" }`
  - Class assignment
    - Assign teacher to class: POST `/schools/teachers/:teacherId/class` `{ "class_id": "<uuid>" }`
    - Unassign teacher from class: DELETE `/schools/teachers/:teacherId/class`
  - Classes
    - GET `/classes` (list school classes)

- Notifications (in-app)
  - GET `/notifications`
  - POST `/notifications/:id/read`
  - POST `/notifications/read-all`
  - GET `/notifications/preferences`
  - PUT `/notifications/preferences`

