# Service Interfaces

**Project:** Smart Healthcare / Telemedicine Platform  
**Report Date:** April 17, 2026

This document enumerates every exposed HTTP interface for each microservice, derived directly from route and controller files in the codebase. All routes are accessed through the API Gateway unless noted otherwise (internal service-to-service calls are marked).

---

## Table of Contents
1. [Auth Service](#1-auth-service)
2. [Patient Management Service](#2-patient-management-service)
3. [Doctor Service](#3-doctor-service)
4. [Appointment Service](#4-appointment-service)
5. [Notification Service](#5-notification-service)
6. [Payment Service](#6-payment-service)
7. [AI Symptom Service](#7-ai-symptom-service)
8. [Telemedicine Service](#8-telemedicine-service)
9. [Audit Management Service](#9-audit-management-service)
10. [API Gateway Health Checks](#10-api-gateway-health-checks)

---

## 1. Auth Service

**Gateway prefix:** `/api/auth`  
**Internal port:** 5000  
**Source:** `services/auth-service/routes/authRoutes.js`, `services/auth-service/controllers/authController.js`

All routes except `register` and `login` require gateway-injected headers (`x-gateway: true`, `x-api-key`).

### POST `/api/auth/register`
Register a new user account.

| Field | Details |
|---|---|
| Auth | None (public) |
| Content-Type | `application/json` |

**Request body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required, min 6 chars)",
  "role": "PATIENT | DOCTOR | ADMIN (optional, default: PATIENT)"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "JWT string",
    "user": { "id": "...", "name": "...", "email": "...", "role": "..." }
  }
}
```

**Response `400`:** `{ "success": false, "message": "Error description" }`

Side effect: publishes `USER_REGISTERED` event to Kafka topic `user-registered`.

---

### POST `/api/auth/login`
Authenticate with email and password.

| Field | Details |
|---|---|
| Auth | None (public) |
| Content-Type | `application/json` |

**Request body:**
```json
{ "email": "string", "password": "string" }
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "JWT string",
    "user": { "id": "...", "name": "...", "email": "...", "role": "..." }
  }
}
```

**Response `401`:** `{ "success": false, "message": "Invalid credentials" }`

Side effect: publishes `LOGIN_SUCCESS` or `LOGIN_FAILED` to Kafka topic `auth-events`.

---

### GET `/api/auth/me`
Return the currently authenticated user's profile.

| Field | Details |
|---|---|
| Auth | Bearer JWT |

**Response `200`:**
```json
{ "success": true, "data": { "id": "...", "name": "...", "email": "...", "role": "..." } }
```

---

### POST `/api/auth/deactivate`
Deactivate the currently authenticated user account.

| Field | Details |
|---|---|
| Auth | Bearer JWT |

**Response `200`:** `{ "success": true, "message": "Account deactivated" }`

---

### GET `/api/auth/users` *(ADMIN)*
Retrieve all registered users.

| Field | Details |
|---|---|
| Auth | Bearer JWT (ADMIN role) |

**Response `200`:**
```json
{ "success": true, "data": [ { "id": "...", "name": "...", "email": "...", "role": "...", "isActive": true } ] }
```

---

### PATCH `/api/auth/users/:userId/status` *(ADMIN)*
Enable or disable a user account.

**Request body:** `{ "isActive": true | false }`

---

### PATCH `/api/auth/users/:userId/role` *(ADMIN)*
Change a user's role.

**Request body:** `{ "role": "PATIENT | DOCTOR | ADMIN" }`

---

### PATCH `/api/auth/users/:userId/verify` *(ADMIN)*
Mark a doctor as verified.

---

### DELETE `/api/auth/users/:userId` *(ADMIN)*
Permanently delete a user.

---

### GET `/api/auth/doctors`
List all doctor users. Used internally by appointment-service.

---

### GET `/api/auth/doctors/:id`
Fetch a single doctor by ID.

---

### GET `/api/auth/doctors/:id/slots`
Retrieve availability slots for a doctor.

**Query params:** `date=YYYY-MM-DD`

---

### POST `/api/auth/doctors/:id/slots/reserve`
Reserve a specific time slot.

**Request body:** `{ "date": "YYYY-MM-DD", "timeSlot": "HH:MM" }`

---

### POST `/api/auth/doctors/:id/slots/release`
Release (un-book) a previously reserved slot.

---

## 2. Patient Management Service

**Gateway prefix:** `/api/patients`, `/api/reports`  
**Internal port:** 5001  
**Source:** `services/patient-management-service/routes/patientRoutes.js`, `routes/reportRoutes.js`

All routes require a valid Bearer JWT via the gateway.

### GET `/api/patients/profile` *(PATIENT)*
Fetch the authenticated patient's profile.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "userId": "auth-service user ID",
    "name": "...",
    "email": "...",
    "dateOfBirth": "...",
    "gender": "...",
    "bloodGroup": "...",
    "phone": "...",
    "address": "...",
    "emergencyContact": {},
    "allergies": []
  }
}
```

---

### PUT `/api/patients/profile` *(PATIENT)*
Update the authenticated patient's profile. Publishes `PROFILE_UPDATED` to Kafka.

**Request body (any subset):**
```json
{
  "dateOfBirth": "string",
  "gender": "string",
  "bloodGroup": "string",
  "phone": "string",
  "address": "string",
  "emergencyContact": {},
  "allergies": []
}
```

---

### GET `/api/patients` *(ADMIN)*
Retrieve all patient profiles.

**Response `200`:** `{ "success": true, "count": N, "data": [...] }`

---

### POST `/api/patients/:userId/prescriptions` *(DOCTOR, ADMIN)*
Add a prescription to a patient's record.

**Request body:**
```json
{
  "medication": "string",
  "dosage": "string",
  "frequency": "string",
  "duration": "string",
  "notes": "string"
}
```

---

### GET `/api/patients/:userId/prescriptions` *(PATIENT, DOCTOR, ADMIN)*
Retrieve all prescriptions for a patient.

---

### POST `/api/patients/:userId/history` *(DOCTOR, ADMIN)*
Append a medical history entry.

**Request body:**
```json
{
  "condition": "string",
  "treatment": "string",
  "date": "ISO date string",
  "notes": "string"
}
```

---

### GET `/api/patients/:userId/history` *(PATIENT, DOCTOR, ADMIN)*
Retrieve full medical history.

---

### POST `/api/reports/upload/:userId` *(PATIENT, DOCTOR, ADMIN)*
Upload a medical report file. Uses `multipart/form-data`.

**Form field:** `report` (file)

**Response `201`:** `{ "success": true, "data": { report metadata } }`

Side effect: publishes `REPORT_UPLOADED` to Kafka `report-uploaded` topic.

---

### GET `/api/reports/:userId` *(PATIENT, DOCTOR, ADMIN)*
List all reports for a patient.

---

### GET `/api/reports/single/:reportId` *(PATIENT, DOCTOR, ADMIN)*
Retrieve a specific report by ID.

---

### GET `/api/reports/:userId/type/:reportType` *(PATIENT, DOCTOR, ADMIN)*
Filter reports by type. Valid `reportType` values: `LAB_RESULT`, `PRESCRIPTION`, `IMAGING`, `DIAGNOSTIC`, `OTHER`.

---

### DELETE `/api/reports/:reportId` *(ADMIN)*
Delete a report and its stored file.

---

## 3. Doctor Service

**Gateway prefixes:** `/api/doctors` (protected), `/api/doctor-auth` (public auth)  
**Internal port:** 5006  
**Source:** `services/doctor-service/src/routes/`

The doctor service has its own JWT-based auth mechanism (`protect` middleware), separate from the main auth-service.

### POST `/api/doctor-auth/register`
Register a new doctor account in the doctor-service.

**Request body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "specialization": "string",
  "clinic": "string",
  "fee": "number",
  "phone": "string"
}
```

---

### POST `/api/doctor-auth/login`
Authenticate a doctor.

**Request body:** `{ "email": "string", "password": "string" }`

**Response `200`:** `{ "token": "JWT", "doctor": { ... } }`

---

### POST `/api/doctor-auth/logout`
Invalidate the doctor's session (stateless — clears client-side token).

---

### GET `/api/doctors/profile` *(AUTH: doctor JWT)*
Retrieve the authenticated doctor's profile.

---

### PUT `/api/doctors/profile` *(AUTH: doctor JWT)*
Update the authenticated doctor's profile.

---

### GET `/api/doctors/appointments` *(AUTH: doctor JWT)*
List all appointments for the authenticated doctor.

---

### GET `/api/doctors/appointments/:id` *(AUTH: doctor JWT)*
Get a single appointment detail.

---

### POST `/api/doctors/appointments/:id/accept` *(AUTH: doctor JWT)*
Accept a pending appointment (changes status to `confirmed`).

---

### POST `/api/doctors/appointments/:id/reject` *(AUTH: doctor JWT)*
Reject a pending appointment (changes status to `cancelled`).

---

### POST `/api/doctors/prescriptions` *(AUTH: doctor JWT)*
Create a new prescription.

---

### GET `/api/doctors/prescriptions` *(AUTH: doctor JWT)*
List all prescriptions issued by the doctor.

---

### GET `/api/doctors/prescriptions/:id` *(AUTH: doctor JWT)*
Get a specific prescription.

---

### POST `/api/doctors/slots` *(AUTH: doctor JWT)*
Create an availability time slot.

**Request body:** `{ "startTime": "HH:MM", "endTime": "HH:MM", "date": "YYYY-MM-DD" }`

---

### GET `/api/doctors/slots` *(AUTH: doctor JWT)*
List all active slots for the doctor.

---

### GET `/api/doctors/admin` *(ADMIN)*
List doctors filtered by approval status.

**Query params:** `status=pending|approved|rejected|all`

---

### POST `/api/doctors/admin/:id/approve` *(ADMIN)*
Approve a doctor's registration.

---

### POST `/api/doctors/admin/:id/reject` *(ADMIN)*
Reject a doctor's registration.

---

### GET `/api/doctors` *(Internal — service key)*
Search approved, active doctors. Used by appointment-service.

**Query params:** `name=string`, `specialty=string`

**Response `200`:** `{ "success": true, "count": N, "data": [ { id, name, specialty, clinic, fee, ... } ] }`

---

### GET `/api/doctors/:id/available-slots` *(Internal — service key)*
Return slots for a doctor on a given date.

**Query params:** `date=YYYY-MM-DD`

**Response `200`:** `{ "success": true, "count": N, "data": [ { _id, timeSlot, startTime, endTime, date, isBooked } ] }`

---

## 4. Appointment Service

**Gateway prefix:** `/api/appointments`  
**Internal port:** 3001  
**Source:** `services/appointment-service/src/routes/appointmentRoutes.js`

### GET `/api/appointments/doctors/search` *(PUBLIC)*
Search for doctors by specialty, name, and/or date.

**Query params:** `specialty`, `name`, `date (YYYY-MM-DD)`

**Response `200`:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    { "id": "...", "name": "Dr. Smith", "specialty": "Cardiology", "fee": 2500, "availableSlots": ["09:00", "10:00"] }
  ]
}
```

---

### GET `/api/appointments/doctors/available-slots` *(PUBLIC)*
Get available time slots for a specific doctor on a date.

**Query params:** `doctorId=string (required)`, `date=YYYY-MM-DD (required)`

**Response `200`:**
```json
{
  "success": true,
  "doctorId": "...",
  "date": "2026-04-20",
  "data": ["09:00", "10:00", "14:00"]
}
```

---

### POST `/api/appointments` *(AUTH required)*
Book a new appointment. Supports optional report file upload via `multipart/form-data`.

**Request body (JSON or form-data):**
```json
{
  "patientId": "string",
  "doctorId": "string",
  "date": "YYYY-MM-DD",
  "timeSlot": "HH:MM",
  "specialty": "string",
  "symptoms": "string (optional)",
  "notes": "string (optional)",
  "consultationType": "video | clinic",
  "report": "file (optional, max 10MB)"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": { "appointmentId": "...", "status": "pending", ... }
}
```

Side effects: reserves slot in doctor-service, publishes `APPOINTMENT_BOOKED` to Kafka.

---

### GET `/api/appointments` *(AUTH required)*
List appointments. Filtered based on role (patient sees own, doctor sees assigned).

---

### GET `/api/appointments/:id` *(AUTH required)*
Retrieve a single appointment by ID.

---

### GET `/api/appointments/:id/receipt` *(AUTH required)*
Download a PDF receipt for an appointment.

**Response:** `application/pdf` stream

---

### GET `/api/appointments/:id/reports` *(AUTH required)*
List uploaded report files attached to an appointment.

---

### GET `/api/appointments/:id/reports/:filename` *(AUTH required)*
Download a specific report file.

---

### PATCH `/api/appointments/:id/status` *(AUTH required)*
Update appointment status.

**Request body:** `{ "status": "confirmed | completed | cancelled" }`

---

### POST `/api/appointments/:id/cancel` *(AUTH required)*
Cancel an appointment.

**Request body:** `{ "reason": "string (optional)" }`

Side effect: publishes `APPOINTMENT_CANCELLED`, releases slot in doctor-service.

---

### PUT `/api/appointments/:id/reschedule` *(AUTH required)*
Reschedule an appointment to a new date/time.

**Request body:** `{ "date": "YYYY-MM-DD", "timeSlot": "HH:MM" }`

---

### GET `/api/appointments/patient/:patientId/upcoming` *(AUTH required)*
Fetch upcoming appointments for a specific patient.

---

### GET `/api/appointments/doctor/:doctorId/pending` *(AUTH required)*
Fetch pending appointments for a specific doctor.

---

## 5. Notification Service

**Gateway prefix:** `/api/notifications`  
**Internal port:** 3002  
**Source:** `services/notification-service/src/routes/notificationRoutes.js`

All routes require Bearer JWT via gateway.

### POST `/api/notifications/send`
Send a custom notification.

**Request body:**
```json
{
  "recipientId": "string",
  "channel": "email | sms | whatsapp",
  "subject": "string",
  "message": "string"
}
```

**Response `201`:** `{ "success": true, "data": { notification record } }`

---

### POST `/api/notifications/appointment`
Trigger appointment-related notifications (both patient and doctor).

**Request body:**
```json
{
  "appointment": { "patientId": "...", "doctorId": "...", "date": "...", "timeSlot": "...", ... },
  "eventType": "created | confirmed | cancelled | rescheduled | reminder"
}
```

---

### GET `/api/notifications`
List notifications for a user.

**Query params:** `userId`, `limit`, `offset`

---

### GET `/api/notifications/failed`
Retrieve all failed notification attempts (for retry monitoring).

---

### GET `/api/notifications/:id`
Get a single notification record.

---

### POST `/api/notifications/:id/retry`
Retry a failed notification.

---

### PATCH `/api/notifications/:id/read`
Mark a notification as read.

---

## 6. Payment Service

**Gateway prefix:** `/api/payments`  
**Internal port:** 5004  
> **Note:** Auth middleware is currently commented out in `paymentProxy.js`. Routes are effectively public at the gateway level, though the payment service itself handles its own logic.

**Source:** `services/payment-service/src/routes/paymentRoutes.js`

### POST `/api/payments/create`
Initiate a Stripe checkout session.

**Request body:**
```json
{
  "userId": "string",
  "appointmentId": "string",
  "amount": "number (LKR)",
  "paymentMethod": "STRIPE"
}
```

**Response `200`:**
```json
{
  "message": "Stripe session created",
  "checkoutUrl": "https://checkout.stripe.com/...",
  "paymentId": "MongoDB ObjectId"
}
```

Side effect: publishes `PAYMENT_COMPLETED` to Kafka when webhook confirms.

---

### POST `/api/payments/confirm/:paymentId`
Manually confirm a payment (used for testing or fallback).

---

### POST `/api/payments/webhook`
Stripe webhook endpoint. Receives raw `application/json` body signed by Stripe.

> This route **must not** have body-parser pre-processing (uses `express.raw()`).

---

### POST `/api/payments/payhere-create`
Initiate a PayHere payment session (Sri Lankan local gateway).

**Request body:** PayHere-specific order data (amount, currency, merchant secret, etc.)

---

### POST `/api/payments/payhere-notify`
PayHere server-to-server payment notification callback.

---

### GET `/api/payments`
List all payment records.

---

### GET `/api/payments/:id`
Get a single payment by ID.

---

### PATCH `/api/payments/:id/status`
Manually update payment status.

**Request body:** `{ "status": "PENDING | COMPLETED | FAILED | REFUNDED" }`

---

## 7. AI Symptom Service

**Gateway prefix:** `/api/symptoms`  
**Internal port:** 5005  
**Auth:** Currently public (no auth middleware in `aiSymptomProxy.js`)  
**Source:** `services/ai-symptom-service/src/routes/symptomRoutes.js`

### POST `/api/symptoms/analyze`
Submit symptoms for AI analysis. Uses Groq API with LLaMA models.

**Request body:**
```json
{
  "userId": "string (required)",
  "symptoms": ["headache", "fever"],
  "age": 30,
  "gender": "male | female | other",
  "duration": "3 days",
  "additionalNotes": "string (optional)"
}
```

**Response `201`:**
```json
{
  "_id": "...",
  "userId": "...",
  "symptoms": ["headache", "fever"],
  "suggestedCondition": "Viral Infection",
  "severity": "LOW | MEDIUM | HIGH",
  "aiResponse": "Based on your symptoms...",
  "possibleCauses": ["stress", "dehydration"],
  "recommendations": ["rest", "hydration"],
  "recommendedDoctorType": "General Practitioner",
  "createdAt": "ISO date"
}
```

---

### GET `/api/symptoms`
List all past symptom check records.

**Response `200`:** Array of `SymptomCheck` documents, sorted by `createdAt` descending.

---

### GET `/api/symptoms/:id`
Get a specific symptom check record.

---

## 8. Telemedicine Service

**Gateway prefix:** `/api/telemedicine`  
**Internal port:** 5007  
**Gateway path rewrite:** `/api/telemedicine/*` → `/api/video/*`  
**Auth:** Bearer JWT required  
**Source:** `services/telemedicine-service/src/routes/videoRoutes.js`

### POST `/api/telemedicine/create-room` *(AUTH: DOCTOR)*
Create a Jitsi video room for an appointment. Validates appointment ownership.

**Request body:**
```json
{ "appointmentId": "MongoDB ObjectId" }
```

**Response `201`:**
```json
{
  "roomName": "appt-<appointmentId>-<uuid>",
  "joinUrl": "https://meet.jit.si/<roomName>",
  "status": "created",
  "doctorId": "...",
  "patientId": "..."
}
```

---

### GET `/api/telemedicine/appointment/:appointmentId` *(AUTH: DOCTOR)*
Retrieve the video session details for an appointment.

**Response `200`:** `{ roomName, joinUrl, status, startedAt, endedAt }`

---

### PATCH `/api/telemedicine/appointment/:appointmentId/end` *(AUTH: DOCTOR)*
End a video session (sets status to `ended`, records `endedAt`).

---

### POST `/api/telemedicine/join-room` *(AUTH: PATIENT)*
Join an existing video room.

**Request body:** `{ "appointmentId": "string" }`

**Response `200`:**
```json
{ "joinUrl": "https://meet.jit.si/...", "roomName": "...", "status": "active" }
```

---

## 9. Audit Management Service

**Gateway prefix:** `/api/audit`  
**Internal port:** 5002 (internal only)  
**Auth:** Bearer JWT required; ADMIN or DOCTOR only  
**Source:** `services/audit-management-service/routes/auditRoutes.js`

> The audit service also ingests events **passively via Kafka** (no REST publishing). REST endpoints are read-only (except admin DELETE).

### GET `/api/audit` *(ADMIN, DOCTOR)*
Retrieve all audit logs, paginated and sortable.

**Query params:** `page`, `limit`, `sortBy`, `order`

**Response `200`:**
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "_id": "...",
      "eventType": "USER_REGISTERED",
      "userId": "...",
      "userRole": "PATIENT",
      "serviceName": "auth-service",
      "description": "User registered: user@example.com",
      "status": "SUCCESS",
      "ipAddress": "172.18.0.1",
      "timestamp": "2026-04-17T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/audit/date-range` *(ADMIN, DOCTOR)*
Filter audit logs by date range.

**Query params:** `start=ISO date`, `end=ISO date`

---

### GET `/api/audit/user/:userId` *(ADMIN, DOCTOR)*
Retrieve logs attributed to a specific user.

---

### GET `/api/audit/service/:serviceName` *(ADMIN, DOCTOR)*
Retrieve logs from a specific service (e.g., `auth-service`, `patient-service`).

---

### GET `/api/audit/action/:action` *(ADMIN, DOCTOR)*
Retrieve logs by event type (e.g., `USER_REGISTERED`, `APPOINTMENT_BOOKED`).

---

### GET `/api/audit/:id` *(ADMIN, DOCTOR)*
Retrieve a single audit log entry by MongoDB ObjectId.

---

### DELETE `/api/audit/:id` *(ADMIN only)*
Delete an audit log entry.

---

## 10. API Gateway Health Checks

The gateway exposes health check pass-through routes that forward to upstream service `/health` endpoints without authentication:

| Gateway Path | Target |
|---|---|
| `GET /api/auth/health` | auth-service `/health` |
| `GET /api/patients/health` | patient-service `/health` |
| `GET /api/reports/health` | patient-service `/health` |
| `GET /api/audit/health` | audit-service `/health` |
| `GET /api/appointments/health` | appointment-service `/health` |
| `GET /api/doctors/health` | doctor-service `/health` |
| `GET /api/symptoms/health` | ai-symptom-service `/health` |
| `GET /api/notifications/health` | notification-service `/health` |
| `GET /api/payments/health` | payment-service `/health` |
| `GET /api/telemedicine/health` | telemedicine-service `/health` |
| `GET /health` (gateway itself) | Returns `{ status: "ok", service: "api-gateway", uptime }` |

---

## Appendix — Source Code References

### `services/auth-service/routes/authRoutes.js`
```js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateGatewayRequest } = require('../middleware/gatewayAuth');

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.get('/me', validateGatewayRequest, authController.getMe.bind(authController));
router.post('/deactivate', validateGatewayRequest, authController.deactivateAccount.bind(authController));
router.get('/users', validateGatewayRequest, authController.getAllUsers.bind(authController));
router.get('/doctors', validateGatewayRequest, authController.getDoctors.bind(authController));
router.get('/doctors/:id', validateGatewayRequest, authController.getDoctorById.bind(authController));
router.get('/doctors/:id/slots', validateGatewayRequest, authController.getDoctorSlots.bind(authController));
router.post('/doctors/:id/slots/reserve', validateGatewayRequest, authController.reserveDoctorSlot.bind(authController));
router.post('/doctors/:id/slots/release', validateGatewayRequest, authController.releaseDoctorSlot.bind(authController));
router.patch('/users/:userId/status', validateGatewayRequest, authController.updateUserStatus.bind(authController));
router.patch('/users/:userId/role', validateGatewayRequest, authController.updateUserRole.bind(authController));
router.delete('/users/:userId', validateGatewayRequest, authController.deleteUser.bind(authController));
router.patch('/users/:userId/verify', validateGatewayRequest, authController.verifyDoctor.bind(authController));
module.exports = router;
```

### `services/appointment-service/src/routes/appointmentRoutes.js`
```js
const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const multer = require('multer');

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/doctors/search', appointmentController.searchDoctors);
router.get('/doctors/available-slots', appointmentController.getAvailableSlots);
router.post('/', upload.single('report'), appointmentController.bookAppointment);
router.get('/', appointmentController.getAllAppointments);
router.get('/:id', appointmentController.getAppointmentById);
router.get('/:id/receipt', appointmentController.downloadAppointmentReceipt);
router.get('/:id/reports', appointmentController.getAppointmentReports);
router.get('/:id/reports/:filename', appointmentController.downloadReport);
router.patch('/:id/status', appointmentController.updateAppointmentStatus);
router.post('/:id/cancel', appointmentController.cancelAppointment);
router.put('/:id/reschedule', appointmentController.rescheduleAppointment);
router.get('/patient/:patientId/upcoming', appointmentController.getUpcomingAppointments);
router.get('/doctor/:doctorId/pending', appointmentController.getPendingAppointmentsForDoctor);
module.exports = router;
```

### `services/patient-management-service/routes/patientRoutes.js`
```js
router.get('/profile', validateGatewayRequest, requireRole('PATIENT'), patientController.getProfile);
router.put('/profile', validateGatewayRequest, requireRole('PATIENT'), patientController.updateProfile);
router.get('/', validateGatewayRequest, requireRole('ADMIN'), patientController.getAllPatients);
router.post('/:userId/prescriptions', validateGatewayRequest, requireRole('DOCTOR', 'ADMIN'), patientController.addPrescription);
router.get('/:userId/prescriptions', validateGatewayRequest, requireRole('PATIENT', 'DOCTOR', 'ADMIN'), patientController.getPrescriptions);
router.post('/:userId/history', validateGatewayRequest, requireRole('DOCTOR', 'ADMIN'), patientController.addMedicalHistory);
router.get('/:userId/history', validateGatewayRequest, requireRole('PATIENT', 'DOCTOR', 'ADMIN'), patientController.getMedicalHistory);
```

### `services/notification-service/src/routes/notificationRoutes.js`
```js
router.post('/send', controller.sendNotification);
router.post('/appointment', controller.sendAppointmentNotifications);
router.get('/', controller.getNotifications);
router.get('/failed', controller.getFailedNotifications);
router.get('/:id', controller.getNotificationById);
router.post('/:id/retry', controller.retryFailedNotification);
router.patch('/:id/read', controller.markAsRead);
```

### `services/payment-service/src/routes/paymentRoutes.js`
```js
router.post("/confirm/:paymentId", confirmPayment);
router.post("/create", createPayment);
router.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
router.post("/payhere-create", createPayHerePayment);
router.post("/payhere-notify", handlePayHereNotify);
router.get("/", getAllPayments);
router.patch("/:id/status", updatePaymentStatus);
router.get("/:id", getPaymentById);
```

### `services/audit-management-service/routes/auditRoutes.js`
```js
router.get('/', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getAllLogs);
router.get('/date-range', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getLogsByDateRange);
router.get('/user/:userId', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getLogsByUser);
router.get('/service/:serviceName', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getLogsByService);
router.get('/action/:action', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getLogsByAction);
router.get('/:id', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getLogById);
router.delete('/:id', validateGatewayRequest, requireRole('ADMIN'), deleteLog);
```

### `services/telemedicine-service/src/routes/videoRoutes.js`
```js
router.post("/create-room", protectDoctor, createVideoRoom);
router.get("/appointment/:appointmentId", protectDoctor, getVideoSessionByAppointment);
router.patch("/appointment/:appointmentId/end", protectDoctor, endVideoSession);
router.post("/join-room", protectPatient, joinRoom);
```

### `services/ai-symptom-service/src/routes/symptomRoutes.js`
```js
router.post("/analyze", submitSymptoms);
router.get("/", getAllChecks);
router.get("/:id", getCheckById);
```

### `services/doctor-service/src/routes/slot_api_routes.js` (internal)
```js
router.use(serviceProtect);  // requires x-api-key
router.get("/", listDoctors);
router.get("/:id/available-slots", getAvailableSlots);
// + POST /:id/slots/reserve, POST /:id/slots/release
```
