# Andoy's Enterprises — Service Scheduling & Attendance Tracking System

> *The Andoy's touch, now on time.*

A working MERN implementation of the system specified in the ISANDE1/ISANDE2
documentation for **Andoy's Enterprises**, San Miguel, Jordan, Guimaras.

It replaces the shop's handwritten logs and verbal coordination with one place
where the manager schedules service work and every employee clocks in, sees
their assignments, and records what they finished.

---

## What it does

| Documented problem | What the system does |
|---|---|
| No formal service tracking | Every job is a record with a status, dates, a client and an assignee |
| Schedule conflicts and understaffing | Assignment is blocked when the mechanic is already booked; mechanics publish the days they are free |
| Informal clock-in, disputed hours | One-tap clock in/out, one record per person per day, hours computed by the server |
| Changes passed on verbally and missed | In-app notifications on every assignment, reschedule and approval |
| No consolidated performance data | Manager dashboard with activity logs, staff status and an hours summary by week/month/year |
| Idle mechanics | Unassigned jobs sit in an open pool that any mechanic can pick up |

## Tech

| Layer | Choice |
|---|---|
| Model | MongoDB + Mongoose schemas |
| View | React 18 (Vite), plain CSS |
| Controller | Node.js + Express |
| Auth | JWT, bcrypt-hashed passwords, role-based access |

No TypeScript, no CSS framework, no ORM beyond Mongoose — the stack stays
inside JavaScript, HTML, CSS, React and MongoDB.

## Repository layout

```
andoys-scheduling-system/
├── server/                  API — the Model and Controller layers
│   ├── src/
│   │   ├── models/          Mongoose schemas (MODEL)
│   │   ├── controllers/     Request handling and business rules (CONTROLLER)
│   │   ├── routes/          URL → controller mapping
│   │   ├── middleware/      Auth, validation, error handling
│   │   ├── config/          Database connection
│   │   ├── utils/           Dates, tokens, error helpers
│   │   ├── app.js           Express wiring
│   │   └── server.js        Entry point
│   └── seed/seed.js         Demo data
├── client/                  React app — the View layer
│   └── src/
│       ├── pages/           One file per screen
│       ├── components/      Reusable UI pieces
│       ├── context/         Auth and notification state
│       ├── api/client.js    The only file that calls the API
│       └── styles/global.css
└── docs/
    ├── SETUP_GUIDE.md       ← start here, step by step
    ├── ARCHITECTURE.md      How MVC is applied
    ├── DATABASE_SCHEMA.md   Every collection and field
    ├── API_REFERENCE.md     Every endpoint
    └── USER_GUIDE.md        How the shop uses it day to day
```

## Quick start

```bash
# 1. API
cd server
npm install
cp .env.example .env        # then edit MONGODB_URI
npm run seed                # demo staff, jobs and logs
npm run dev                 # http://localhost:5000

# 2. Client (second terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Demo accounts (password `andoys123` for all):

| Email | Role |
|---|---|
| `manager@andoys.ph` | Manager — full dashboard |
| `antonio@andoys.ph` | Mechanic |
| `alex@andoys.ph` | Staff (driver) |

Full instructions, including how to point every group member at one shared
database, are in **[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)**.

## Where the shared database fits

The connection string lives in `server/.env` and nowhere else. Today it points
at a local MongoDB on your own machine. When the group creates one MongoDB
Atlas cluster, everyone changes that single line to the Atlas URI and the whole
team is working on the same data — no code changes. Step 6 of the setup guide
walks through it.

## Adding the real logo

Drop the shop's logo into `client/public/logo.png`. Every screen picks it up
automatically; until then the app shows a plain wordmark.

## Status

Every feature listed in the requirements chapter is implemented end to end:
authentication, user management, availability, service scheduling with conflict
checking, attendance and hours, activity logs, notifications, shift requests,
and the manager dashboard. Not implemented, and deliberately out of scope per
the documentation: payroll, inventory, and customer-facing booking.
