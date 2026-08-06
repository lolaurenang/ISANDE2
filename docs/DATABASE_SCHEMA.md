# Database schema

Database name: `andoys` · 7 collections · Mongoose 8

```
User ──< Attendance          one attendance row per person per day
  │
  ├───< Availability         one row per person per day they can work
  ├───< ActivityLog          append-only audit trail
  ├───< Notification         one row per alert delivered
  ├───< ShiftRequest         leave and shift-change requests
  └───< ServiceJob           assignedTo / createdBy
                │
                └──< ActivityLog.relatedJob
```

Every document also carries `createdAt` and `updatedAt` from Mongoose
`timestamps: true`. They are omitted from the tables below.

---

## `users`

The person. Three roles, one collection — the differences are permissions, not
data shape.

| Field | Type | Rules |
|---|---|---|
| `fullName` | String | required, ≤ 120 chars |
| `email` | String | required, **unique**, lowercased, format-checked |
| `password` | String | required, ≥ 8 chars, bcrypt-hashed, `select: false` |
| `phone` | String | optional |
| `role` | String | `manager` \| `mechanic` \| `staff`, default `mechanic` |
| `jobTitle` | String | free text, e.g. "Mechanic", "Cashier" |
| `department` | String | Management \| Mechanic \| Sales \| Marketing \| Accounting \| Others |
| `status` | String | `available` \| `on-duty` \| `absent` \| `off-duty` |
| `avatarUrl` | String | optional |
| `weeklyHourTarget` | Number | default 40, used by the hours report |
| `isActive` | Boolean | default true — accounts are deactivated, never deleted |
| `lastLoginAt` | Date | |

**Indexes:** `email` (unique), `(role, isActive)`

**Hooks:** `pre('save')` hashes the password whenever it changes.
**Methods:** `comparePassword(candidate)`.
`toJSON` strips `password` and `__v`, so a leak through the API is not possible.

> Accounts are deactivated rather than deleted so their attendance history and
> activity logs stay intact and readable.

---

## `attendances`

One row per employee per working day.

| Field | Type | Rules |
|---|---|---|
| `employee` | ObjectId → User | required |
| `workDate` | String | required, `YYYY-MM-DD` |
| `clockIn` | Date | set on clock-in |
| `clockOut` | Date | set on clock-out |
| `minutesWorked` | Number | computed at clock-out |
| `status` | String | `present` \| `late` \| `absent` \| `on-leave` |
| `notes` | String | ≤ 500 chars |

**Indexes:** `(employee, workDate)` **unique**, `workDate` descending

**Virtuals:** `hoursWorked` (minutes ÷ 60, 2 dp), `isOpen` (clocked in, not out)

The unique compound index is what makes double clock-in impossible. Arriving
after 09:00 sets `status` to `late` automatically.

---

## `servicejobs`

A scheduled piece of work.

| Field | Type | Rules |
|---|---|---|
| `title` | String | required, ≤ 120 chars |
| `description` | String | ≤ 1000 chars |
| `serviceType` | String | motorcycle-repair \| bike-repair \| oil-change \| engine-tuneup \| overhaul \| wheel-alignment \| supplier-delivery \| other |
| `clientName` | String | optional |
| `startDate` | Date | required |
| `endDate` | Date | required, **must be ≥ `startDate`** |
| `assignedTo` | ObjectId → User | null means an open job anyone can pick up |
| `createdBy` | ObjectId → User | required |
| `status` | String | `scheduled` \| `in-progress` \| `completed` \| `cancelled` |
| `priority` | String | `low` \| `normal` \| `high` |
| `completedAt` | Date | set automatically when status becomes completed |

**Indexes:** `assignedTo`, `(startDate, endDate)`, `(status, startDate)`
**Virtuals:** `durationDays`

Overlap queries use `startDate ≤ rangeEnd AND endDate ≥ rangeStart`, which is
why both dates are indexed.

---

## `availabilities`

The days a mechanic says they can work.

| Field | Type | Rules |
|---|---|---|
| `employee` | ObjectId → User | required |
| `workDate` | String | required, `YYYY-MM-DD` |
| `isAvailable` | Boolean | default true |
| `startTime` | String | `HH:mm`, default `08:00` |
| `endTime` | String | `HH:mm`, default `17:00` |
| `note` | String | ≤ 300 chars |

**Indexes:** `(employee, workDate)` **unique**

Unique + upsert means saving the same day twice updates rather than duplicates,
so the mobile "tap a day" interaction is safely idempotent.

---

## `activitylogs`

Append-only feed. Nothing edits or deletes these.

| Field | Type | Rules |
|---|---|---|
| `employee` | ObjectId → User | required |
| `type` | String | `clock-in` \| `clock-out` \| `work` \| `schedule` \| `account` |
| `message` | String | required, ≤ 300 chars |
| `work` | String | what was done, for `work` entries |
| `clientName` | String | who it was for |
| `relatedJob` | ObjectId → ServiceJob | optional |
| `loggedAt` | Date | defaults to now, indexed |

**Indexes:** `employee`, `loggedAt` descending

Renders as the manager's log feed:
`Mark Perez · 11:45 · WORK: Repaired wheels / CLIENT: Horse`

---

## `notifications`

| Field | Type | Rules |
|---|---|---|
| `recipient` | ObjectId → User | required |
| `title` | String | required, ≤ 120 chars |
| `message` | String | required, ≤ 500 chars |
| `type` | String | `assignment` \| `schedule-change` \| `request` \| `reminder` \| `system` |
| `relatedJob` | ObjectId → ServiceJob | optional |
| `isRead` | Boolean | default false |
| `readAt` | Date | |

**Indexes:** `(recipient, isRead, createdAt desc)` — serves the unread badge in
one index scan.

---

## `shiftrequests`

| Field | Type | Rules |
|---|---|---|
| `requestedBy` | ObjectId → User | required |
| `type` | String | `leave` \| `shift-change` \| `schedule-swap` |
| `workDate` | String | required, `YYYY-MM-DD` |
| `reason` | String | required, ≤ 500 chars |
| `status` | String | `pending` \| `approved` \| `denied`, indexed |
| `reviewedBy` | ObjectId → User | set on review |
| `reviewedAt` | Date | |
| `reviewNote` | String | ≤ 300 chars |

Only `pending` requests can be reviewed or withdrawn — the controller rejects a
second review, so an approval cannot be silently overturned.

---

## Why these choices

**Dates as strings for calendar days.** `workDate` is a *day*, not an instant.
Storing it as `'2026-07-03'` means it reads the same everywhere and compares
correctly with plain string operators (`$gte`, `$lte`) because ISO format sorts
lexicographically.

**References, not embedding.** A job's assignee is an ObjectId, not a copy of
the user. Staff details change; jobs, logs and attendance rows outlive them.
`.populate()` joins them at read time.

**Deactivate, never delete.** Removing a user would orphan months of attendance
history. `isActive: false` hides them from the staff list and blocks login while
keeping every record readable.

**Unique compound indexes as the last line of defence.** Application checks can
race; a unique index cannot. `(employee, workDate)` on both `attendances` and
`availabilities` makes duplicates impossible at the storage layer.
