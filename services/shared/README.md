# Shared Kafka Event System

This folder contains the centralized Kafka event definitions and utilities used across all microservices in the healthcare platform.

## Overview

The shared event system ensures consistent event publishing and consumption across all services:
- **API Gateway**: Publishes authentication and user management events
- **Patient Management Service**: Publishes patient, report, and medical record events
- **Audit Management Service**: Consumes all events for audit logging

## Structure

```
shared/
└── kafka/
    ├── topics.js        # Kafka topic name constants
    ├── events.js        # Event type constants
    └── eventFactory.js  # Standard event payload creator
```

## Usage

### 1. Import the Shared Modules

```javascript
const TOPICS = require('../../shared/kafka/topics');
const EVENTS = require('../../shared/kafka/events');
const { createEvent } = require('../../shared/kafka/eventFactory');
```

### 2. Create a Standard Event

```javascript
const event = createEvent({
  eventType: EVENTS.PATIENT_UPDATED,
  userId: req.user.id,
  userRole: 'PATIENT',
  serviceName: 'patient-management-service',
  description: 'Patient profile updated',
  status: 'SUCCESS',
  ipAddress: req.ip || '0.0.0.0',
  metadata: {
    patientId: patient._id,
    updatedFields: ['phone', 'address']
  }
});
```

### 3. Publish the Event

```javascript
const { publishEvent } = require('../kafka');

publishEvent(TOPICS.PATIENT_UPDATED, event)
  .catch(err => console.error('Failed to publish event:', err));
```

## Available Topics

### General Domain Topics
- `PATIENT_EVENTS` - Aggregated patient-related events
- `DOCTOR_EVENTS` - Doctor-related events
- `APPOINTMENT_EVENTS` - Appointment scheduling events
- `PAYMENT_EVENTS` - Payment and billing events
- `NOTIFICATION_EVENTS` - Notification events
- `AUTH_EVENTS` - Authentication events (login, logout)
- `ADMIN_EVENTS` - Administrative actions

### Specific Event Topics
- `USER_REGISTERED` - New user account created
- `USER_DEACTIVATED` - User account deactivated
- `PATIENT_REGISTERED` - Patient profile created
- `PATIENT_UPDATED` - Patient profile updated
- `PATIENT_DEACTIVATED` - Patient profile deactivated
- `REPORT_UPLOADED` - Medical report uploaded
- `REPORT_DELETED` - Medical report deleted

## Available Event Types

### Authentication Events
- `USER_REGISTERED` - User registration
- `USER_DEACTIVATED` - User deactivation
- `LOGIN_SUCCESS` - Successful login
- `LOGIN_FAILED` - Failed login attempt
- `ROLE_UPDATED` - User role changed

### Patient Events
- `PATIENT_REGISTERED` - Patient profile created
- `PATIENT_UPDATED` - Patient profile updated
- `PATIENT_DEACTIVATED` - Patient profile deactivated
- `PROFILE_UPDATED` - Patient profile updated

### Medical Records Events
- `PRESCRIPTION_ADDED` - New prescription added
- `MEDICAL_HISTORY_ADDED` - Medical history entry added

### Report Events
- `REPORT_UPLOADED` - Medical report uploaded
- `REPORT_DELETED` - Medical report deleted

### Other Events
- `DOCTOR_VERIFIED` - Doctor account verified
- `APPOINTMENT_BOOKED` - Appointment scheduled
- `APPOINTMENT_CANCELLED` - Appointment cancelled
- `PAYMENT_COMPLETED` - Payment processed
- `USER_DELETED` - User permanently deleted
- `STAFF_SELECTED` - Staff member selected

## Event Payload Structure

All events follow this standardized structure:

```javascript
{
  eventType: 'EVENT_TYPE',      // Required: Event identifier
  userId: 'user-id',             // Required: User who triggered the event
  userRole: 'PATIENT',           // Optional: User's role (PATIENT | DOCTOR | ADMIN)
  serviceName: 'service-name',   // Required: Originating service
  description: 'Human-readable', // Required: Event description
  status: 'SUCCESS',             // Optional: SUCCESS | FAILED (default: SUCCESS)
  timestamp: '2024-03-26T...',   // Auto-generated: ISO timestamp
  ipAddress: '127.0.0.1',        // Optional: IP address (default: 0.0.0.0)
  metadata: {                    // Optional: Additional event data
    // Any custom fields
  }
}
```

## Best Practices

1. **Never hardcode topic names** - Always use `TOPICS` constants
2. **Never hardcode event types** - Always use `EVENTS` constants
3. **Always use eventFactory** - Ensures consistent event structure
4. **Include relevant metadata** - Add context-specific data in the `metadata` field
5. **Handle publish errors gracefully** - Use `.catch()` to prevent service disruption
6. **Log event publishing** - Track successful and failed publishes for debugging

## Service-Specific Implementation

### API Gateway
Publishes events for:
- User registration (`USER_REGISTERED` → `user-registered` topic)
- User deactivation (`USER_DEACTIVATED` → `user-deactivated` topic)
- Login success (`LOGIN_SUCCESS` → `auth-events` topic)
- Login failure (`LOGIN_FAILED` → `auth-events` topic)

### Patient Management Service
Publishes events for:
- Patient profile updates (`PATIENT_UPDATED` → `patient-updated` topic)
- Prescription additions (`PRESCRIPTION_ADDED` → `patient-events` topic)
- Medical history additions (`MEDICAL_HISTORY_ADDED` → `patient-events` topic)
- Report uploads (`REPORT_UPLOADED` → `report-uploaded` topic)
- Report deletions (`REPORT_DELETED` → `report-deleted` topic)

Consumes events from:
- `user-registered` - Creates patient profiles for new PATIENT users
- `user-deactivated` - Marks patient profiles as inactive

### Audit Management Service
Consumes ALL topics and stores audit logs in MongoDB for compliance and monitoring.

## Migration Notes

The shared event system replaces hardcoded topic names and provides standardized event structures. All services now import from the shared folder at the repository root.

### Changes Made:
1. ✅ Created `/shared/kafka/` folder at root level
2. ✅ Moved topic definitions from audit service to shared folder
3. ✅ Updated all services to import from shared folder
4. ✅ Standardized event publishing using `createEvent()`
5. ✅ Added event publishing for all major operations
6. ✅ Updated audit service to handle all new topics

### Breaking Changes:
- Topic imports must now use relative path: `require('../../shared/kafka/topics')`
- Event payloads now follow standardized structure from `eventFactory`
- Services must use `TOPICS` and `EVENTS` constants instead of string literals
