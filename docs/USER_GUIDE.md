# User guide

Written for the people in the shop, not for the developers. Print it, or paste
it into the technical-guide section of the paper.

---

## Getting an account

Ask the manager to add you, or sign up yourself at the login screen. Leave the
**Manager code** box empty — only the owner has that code, and it is what
separates a manager account from an employee one.

Your email address is your username. Passwords must be at least 8 characters.

---

## For mechanics and staff

### Every morning: clock in

Open **Home** and press **Clock in**. The button changes to **Clock out** for
the rest of the day.

- Clock in after 09:00 and the day is recorded as *late*.
- You cannot clock in twice, and you cannot clock in for yesterday. If you
  forgot, tell the manager — they can correct the record.

### Every evening: clock out

Press **Clock out** on Home. Your hours are calculated and saved at that moment.
If you forget, the day stays open and shows no hours until the manager fixes it.

### Tell the manager which days you can work

**Schedule → Availability**. Tap a date to mark yourself available; tap it again
to take it back. The days you have chosen appear as a list beside the calendar.

Do this a week ahead. The manager can only book you on days you have marked, so
an empty calendar means no work.

### See what you have been assigned

- **Home** — today's job and anything coming up.
- **Calendar** — the whole month.
- **Schedule → Jobs** — today, upcoming, and any open jobs.

Open jobs are ones nobody has been assigned yet. Press **Take this job** to
claim one; it moves to your schedule immediately.

### Record what you finished

On any of today's jobs, press **Log work**, write what you did and who it was
for, and save. The entry appears in the manager's feed with your name and the
time — this is how your work gets counted.

When a job is done, press **Mark completed**.

### Ask for a day off

**Profile → Request time off**. Pick the type, the date and the reason. The
manager gets a notification and you get one back when they decide. You can
withdraw a request as long as it is still pending.

### Notifications

The bell in the sidebar (or Profile on a phone) shows a dot when something is
waiting: a new assignment, a schedule change, a decision on your request.

---

## For the manager

### Home

Your greeting, today's jobs across the whole shop, headcount by status, pending
request count, and the live log of who clocked in and what they finished.

### Scheduling work

**Schedule → Add job**. Fill in the title, description, service type, client and
dates, then choose who does it.

- **Leave it open** and any mechanic can pick it up. Useful for filling gaps.
- **Assign someone** and they are notified straight away.

If the person is already booked across those dates, the system refuses and names
the job that clashes. Change the dates or pick someone else.

To see who is free before booking, check **Schedule → Availability**, or use the
suggestion endpoint if you are working from the API.

### Editing and cancelling

Every job card has **Edit** and **Remove**. Both notify the assignee. Removing a
job is permanent — the record is gone, though the activity logs written against
it stay.

### The Dashboard

Four tabs, each filtered by Week / Month / Year:

- **Logs** — everything that happened, newest first, with job counts on top.
- **Staff** — everyone, their department and status. Change someone's status
  from the dropdown when you know they are out.
- **Hours** — total hours per person, days present, days late, days absent. This
  is what you use for performance reviews and pay discussions.
- **Requests** — approve or deny time off. The employee is notified either way.

### Correcting attendance

If someone forgot to clock out, their day has no hours. Fix it through
`PATCH /api/attendance/:id` (see the API reference) — the record keeps its
`updatedAt` stamp so corrections are visible.

### Managing accounts

**Dashboard → Staff** shows everyone. Deactivating an account blocks login but
keeps every attendance record and log entry readable. Nothing is ever deleted.

---

## On a phone

The app works on any phone browser. Instead of the dark sidebar you get a tab
bar at the bottom: Home, Calendar, Schedule, Dashboard (managers only) and
Profile. Everything else behaves the same.

To keep it one tap away, open the site in Chrome or Safari and choose **Add to
Home Screen**.

---

## Common questions

**I forgot my password.**
Ask the manager to reset it from the staff list. There is no email reset yet.

**I clocked in on the wrong account.**
Log out, log in as yourself, clock in. Tell the manager so they can correct the
other record.

**A job I was assigned disappeared.**
The manager either reassigned or removed it. Check your notifications — both
send one.

**Nothing loads.**
The server is not running, or your internet is down. Refresh; if the screen
stays empty, tell whoever runs the server.

**Why can't I see the Dashboard?**
It is manager-only. If you should have it, your account needs its role changed.
