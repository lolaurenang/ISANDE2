# Architecture

## How MVC is applied here

The application is a client–server pair, and MVC maps across both halves:

```
┌───────────────────────── VIEW ─────────────────────────┐
│  client/src/pages/        one file per screen           │
│  client/src/components/   reusable UI pieces            │
│  client/src/context/      auth + notification state     │
│  client/src/api/client.js the only file that fetches    │
└────────────────────────────┬───────────────────────────┘
                             │  HTTP + JSON, JWT in the header
┌────────────────────── CONTROLLER ──────────────────────┐
│  server/src/routes/       URL → handler                 │
│  server/src/middleware/   auth, validation, errors      │
│  server/src/controllers/  request handling, workflow    │
└────────────────────────────┬───────────────────────────┘
                             │  Mongoose
┌───────────────────────── MODEL ────────────────────────┐
│  server/src/models/       schemas, validation, hooks    │
│  MongoDB                  storage                       │
└─────────────────────────────────────────────────────────┘
```

### Model — `server/src/models/`

Each file defines one collection: its fields, the rules that must always hold,
its indexes, and any behaviour that belongs to the data itself.

The rule of thumb: **if it must be true no matter who is asking, it belongs in
the model.** Passwords are hashed by a `pre('save')` hook on `User`, so no
controller can store a plain one even by mistake. `Attendance` has a unique
compound index on `(employee, workDate)`, so a duplicate day is impossible even
if two requests race each other.

Models never import Express and never see a request or response object.

### Controller — `server/src/controllers/`

Each function reads the request, calls the models, and shapes a response.
Workflow that spans several collections lives here: creating a `ServiceJob` also
checks for conflicts and creates a `Notification`; clocking out writes the
`Attendance` row, flips the user's status, and appends an `ActivityLog`.

Controllers never build HTML and never talk to the database driver directly —
only through models.

### View — `client/src/`

React renders state and collects input. It holds no business rules. When the
Schedule page refuses to double-book a mechanic, that decision was made by the
server; the page only displays the message it got back.

`api/client.js` is the single seam between View and Controller. Every screen
imports from it, so the auth header, the base URL and error shaping are defined
once. Changing the API host is a one-line change in one file.

---

## Request lifecycle

A manager assigns a job:

```
1. Schedule.jsx          user submits the "Add job" form
2. api/client.js         POST /api/jobs, Authorization: Bearer <jwt>
3. routes/jobRoutes.js   matches the route
4. middleware/auth.js    protect  → verifies the JWT, loads req.user
                         authorize('manager') → checks the role
5. express-validator     title present? dates valid? → 400 with field errors
6. serviceJobController  findConflicts() → 409 if the mechanic is busy
                         ServiceJob.create()
                         Notification.create()
7. models/ServiceJob.js  schema validation, endDate >= startDate
8. MongoDB               document written
9. errorHandler.js       (only if anything threw) → one consistent JSON shape
10. Schedule.jsx         reloads the list, shows a success banner
```

Every request follows this path. There is no second way in.

---

## Design decisions worth defending in the paper

**Calendar days are stored as `'YYYY-MM-DD'` strings, not Dates.**
A shift on July 3 is July 3 whether the phone is set to Manila or UTC. Storing a
`Date` for "a day" invites off-by-one bugs the moment a device timezone differs.
Timestamps that mean an actual instant — `clockIn`, `loggedAt` — stay as `Date`.

**Minutes worked are written once, at clock-out.**
The alternative is recomputing across every attendance document on every report.
Writing the number once, at the only moment it can be known, keeps the hours
summary fast as the collection grows.

**Conflict checking lives in the controller, not the model.**
Whether a job clashes depends on *other* documents, so it cannot be a schema
validator. It sits in `findConflicts()`, called by both create and update, so
neither path can skip it.

**`ActivityLog` is append-only.**
Nothing edits or deletes a log row. It is the audit trail that replaces the
shop's notebook, and a trail you can edit is not a trail.

**Roles are checked by middleware, not inside handlers.**
`authorize('manager')` sits in the route definition, so the permission a route
requires is visible in the route table without reading any controller.

**Employees never receive other people's data.**
`listAttendance` and `listJobs` overwrite any `employee` query parameter with
`req.user.id` for non-managers. The filtering happens server-side; hiding a
button in React is not access control.

---

## What is deliberately not here

| Not built | Why |
|---|---|
| Payroll | Out of scope per section 4.2.3 of the documentation |
| Inventory | Same — the project scoped to service tracking only |
| Customer booking portal | Internal system; clients still walk in or call |
| Real-time websockets | Polling every 60s is enough for a six-person shop and far simpler to deploy |
| Password reset by email | Needs an SMTP account; the manager resets passwords from the staff list instead |

Each of these is a reasonable "future work" entry for the conclusion chapter.
