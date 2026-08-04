# API reference

Base URL: `http://localhost:5000/api`

Every response uses the same envelope:

```jsonc
// success
{ "success": true, "message": "Job scheduled", "data": { } }

// failure
{ "success": false, "message": "Some fields need fixing",
  "details": [ { "field": "title", "message": "Give the job a title" } ] }
```

Authentication is a bearer token:

```
Authorization: Bearer <jwt>
```

**Access column:** *public* · *any* (any logged-in user) · *manager*

---

## Auth

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/signup` | public | Create an account |
| POST | `/auth/login` | public | Exchange credentials for a token |
| GET | `/auth/me` | any | The current user — used to restore a session |
| PATCH | `/auth/password` | any | Change your own password |

```jsonc
// POST /auth/signup
{ "fullName": "Antonio Santos", "email": "antonio@andoys.ph",
  "password": "andoys123", "phone": "0992 123 4567",
  "jobTitle": "Mechanic",
  "managerCode": ""            // matching MANAGER_INVITE_CODE creates a manager
}
// 201 → { data: { user, token } }
```

Signup creates a `mechanic` unless `managerCode` matches the server's
`MANAGER_INVITE_CODE`. Without that gate, anyone could self-promote to manager.

---

## Users

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/users` | any | Staff directory. `?role=` `?department=` `?active=all` |
| GET | `/users/:id` | self or manager | One employee |
| POST | `/users` | manager | Add an account directly |
| PATCH | `/users/:id` | self or manager | Update. Employees may change name, phone, avatar, status; managers may also change role, job title, department, hour target and active state |
| DELETE | `/users/:id` | manager | Deactivate (never deletes) |

---

## Attendance

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/attendance/clock-in` | any | Start your shift |
| POST | `/attendance/clock-out` | any | End it; minutes are computed here |
| GET | `/attendance/today` | any | Your record for today — drives the button state |
| GET | `/attendance` | any | History. `?from=` `?to=` `?employee=` `?limit=` |
| GET | `/attendance/summary` | manager | Hours per employee. `?view=week\|month\|year` `?date=` |
| PATCH | `/attendance/:id` | manager | Correct a record, e.g. a missed clock-out |

Employees always get their own rows from `GET /attendance` regardless of the
`employee` parameter they send. Clocking in after 09:00 is marked `late`.

```jsonc
// GET /attendance/summary?view=week
{ "success": true,
  "range": { "view": "week", "from": "2026-08-02", "to": "2026-08-08" },
  "data": [ { "employee": { "id": "…", "fullName": "Antonio Santos" },
              "totalHours": 38.5, "daysPresent": 5,
              "daysLate": 1, "daysAbsent": 0, "targetHours": 40 } ] }
```

---

## Service jobs

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/jobs` | any | List. `?view=` `?date=` `?status=` `?employee=` `?unassigned=true` |
| GET | `/jobs/suggest` | manager | Who is free for a date range. `?startDate=` `?endDate=` |
| GET | `/jobs/:id` | any | One job |
| POST | `/jobs` | manager | Schedule a job |
| PATCH | `/jobs/:id` | manager, or the assignee | Managers edit anything; the assignee may change status and description only |
| DELETE | `/jobs/:id` | manager | Remove it and notify the assignee |
| POST | `/jobs/:id/logs` | any | Record finished work |

Managers see the whole shop. Everyone else sees their own jobs plus unassigned
ones they could pick up.

```jsonc
// POST /jobs
{ "title": "Motorcycle Repair",
  "description": "Inspect and replace the damaged clutch cable.",
  "serviceType": "motorcycle-repair", "clientName": "Ramon Villareal",
  "startDate": "2026-08-05", "endDate": "2026-08-07",
  "assignedTo": "665f…",     // null leaves it open
  "priority": "high" }

// 409 when the mechanic is already booked
{ "success": false,
  "message": "That mechanic already has \"Bike Repair\" booked for those dates",
  "details": [ { "title": "Bike Repair", "startDate": "…", "endDate": "…" } ] }
```

```jsonc
// POST /jobs/:id/logs
{ "work": "Repaired wheels", "clientName": "Horse" }
```

---

## Availability

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/availability` | any | **Your own** days by default. `?from=` `?to=`. Managers may add `?employee=<id>` or `?all=true` |
| GET | `/availability/roster` | manager | Who is free each day, plus who declared nothing. `?view=` `?date=` |
| POST | `/availability` | any | Save one day (upsert) |
| POST | `/availability/bulk` | any | Save many, by list or by range |
| POST | `/availability/bulk-remove` | any | Clear many: `{ "dates": [...] }` |
| DELETE | `/availability/:workDate` | any | Take one day back |

**Scoping.** A request is about your own availability unless you are a manager
*and* you explicitly ask for someone else's. Without that rule, a manager
opening the Schedule page saw every mechanic's days merged into their own
calendar, and tapping a day tried to delete a record they did not own.

```jsonc
// POST /availability/bulk — either shape works
{ "dates": ["2026-08-05", "2026-08-06"], "startTime": "08:00", "endTime": "17:00" }
{ "from": "2026-08-03", "to": "2026-08-08", "skipSundays": true }
```

```jsonc
// GET /availability/roster?view=week
{ "data": { "2026-08-05": [ { "id": "…", "fullName": "Antonio Santos",
                              "startTime": "08:00", "endTime": "17:00" } ] },
  "noAvailability": [ { "id": "…", "fullName": "Rey Bautista" } ] }
```

`noAvailability` lists active employees who declared nothing in the range. They
cannot be booked, and an empty calendar is exactly why a mechanic ends up idle,
so the roster names them rather than leaving the manager to notice.

---

## Notifications

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/notifications` | any | Your latest 50. `?unread=true` |
| PATCH | `/notifications/:id/read` | any | Mark one read |
| PATCH | `/notifications/read-all` | any | Mark all read |
| POST | `/notifications/broadcast` | manager | Message every active employee |

The list response includes `unreadCount`, which the client polls every 60
seconds to keep the sidebar badge current.

---

## Shift requests

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/requests` | any | Managers see all; employees see their own. `?status=` |
| POST | `/requests` | any | Ask for time off or a shift change |
| PATCH | `/requests/:id/review` | manager | `{ "status": "approved" \| "denied", "reviewNote": "" }` |
| DELETE | `/requests/:id` | owner | Withdraw a pending request |

---

## Dashboard

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/dashboard/home` | any | Everything the Home screen needs |
| GET | `/dashboard/calendar` | any | Jobs for a week/month/year. `?view=` `?date=` |
| GET | `/dashboard/manager` | manager | Logs, staff list and job counts. `?view=` `?date=` |

`/dashboard/home` returns extra fields — `todayLogs`, `staff`, `headcount`,
`pendingRequests` — only when the caller is a manager. One request per screen
instead of six.

---

## Reports

All manager-only. Every report accepts the same parameters and returns either a
JSON preview or a CSV download.

| Method | Path | Purpose |
|---|---|---|
| GET | `/reports` | List the available reports with names and descriptions |
| GET | `/reports/:type` | Run one |

**Parameters**

| Name | Default | Notes |
|---|---|---|
| `from`, `to` | current month | `YYYY-MM-DD`; both required together |
| `view`, `date` | `month`, today | Used only when `from`/`to` are absent |
| `format` | `json` | `csv` returns a file download |

**Types:** `attendance` · `hours` · `jobs` · `productivity` · `logs` ·
`availability` · `requests`

```jsonc
// GET /reports/hours?from=2026-08-01&to=2026-08-31
{ "success": true,
  "data": {
    "type": "hours",
    "title": "Hours summary",
    "range": { "from": "2026-08-01", "to": "2026-08-31" },
    "generatedAt": "2026-08-05T09:14:22.104Z",
    "generatedBy": "Alen Mariano D. Garcia",
    "count": 15,
    "columns": [ { "key": "employee", "label": "Employee" }, … ],
    "rows": [ { "employee": "Antonio Santos", "totalHours": 162.5,
                "daysPresent": 21, "daysLate": 3, "missingClockOut": 1 }, … ]
  } }
```

```bash
# CSV straight to disk
curl -H "Authorization: Bearer $TOKEN" -OJ \
  "http://localhost:5000/api/reports/hours?from=2026-08-01&to=2026-08-31&format=csv"
```

The CSV is UTF-8 with a byte-order mark, so Excel renders Filipino names with
accents correctly instead of mojibake. Fields containing commas, quotes or
newlines are quoted per RFC 4180.

Preview and download are built from the same query, so the file can never
disagree with what was on screen.

---

## Status codes

| Code | Meaning |
|---|---|
| 200 | Fine |
| 201 | Created |
| 400 | Validation failed — read `details` for the offending fields |
| 401 | Missing, invalid or expired token |
| 403 | Logged in, but the role does not allow it |
| 404 | No such record or route |
| 409 | Conflict — duplicate email, double clock-in, or a schedule clash |
| 500 | Server fault; the full stack is in the server terminal |

---

## Trying it from the terminal

```bash
# log in and keep the token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@andoys.ph","password":"andoys123"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')

# use it
curl -s http://localhost:5000/api/dashboard/home -H "Authorization: Bearer $TOKEN"
```