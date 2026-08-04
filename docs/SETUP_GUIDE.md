# Setup guide — step by step

Follow these in order. Steps 1–5 get the system running on one machine.
Step 6 turns the database into a shared one for the whole group.
Step 7 puts it online.

Everything assumes a terminal open at the project folder.

---

## Step 0 — Install the tools you need

| Tool | Version | Check with | Where |
|---|---|---|---|
| Node.js | 18 or newer | `node -v` | https://nodejs.org (LTS) |
| npm | comes with Node | `npm -v` | — |
| MongoDB Community Server | 6 or newer | `mongod --version` | https://www.mongodb.com/try/download/community |
| Git | any | `git --version` | https://git-scm.com |

MongoDB Compass (the GUI) is bundled with the Community Server installer.
Install it too — it is the easiest way to see whether your data is really saving.

> If any command says "not found", close and reopen the terminal first. The
> installers add to your PATH and the old terminal session does not know yet.

---

## Step 1 — Get the code

```bash
git clone <your-repo-url> andoys-scheduling-system
cd andoys-scheduling-system
```

Working from a zip instead? Unzip it and `cd` into the folder.

---

## Step 2 — Start MongoDB

**Windows** — MongoDB installs as a service and usually starts on its own.
Confirm in Services (`Win + R` → `services.msc`) that *MongoDB Server* is Running.

**macOS** (Homebrew):

```bash
brew services start mongodb-community
```

**Linux**:

```bash
sudo systemctl start mongod
```

Test it:

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

A response containing `ok: 1` means the database is up.

---

## Step 3 — Configure and start the API

```bash
cd server
npm install
```

Copy the example environment file and open the copy:

```bash
cp .env.example .env      # Windows PowerShell: copy .env.example .env
```

Edit `server/.env`. For local development you only need to change one line:

```ini
JWT_SECRET=some-long-random-string-you-invent-right-now
```

Leave `MONGODB_URI=mongodb://127.0.0.1:27017/andoys` as it is for now.

> `.env` is in `.gitignore` on purpose. Never commit it — it holds your
> database password and signing key. Commit `.env.example` instead.

Load the demo data:

```bash
npm run seed
```

It builds three months of shop history — six weeks behind today and five ahead —
and prints a row count per collection when it finishes. Everything should read
`ok` except `users` (15, which matches the org chart in your documentation).

| Command | What it does |
|---|---|
| `npm run seed` | Add demo data; refuses if users already exist |
| `npm run seed:reset` | Wipe everything first, then add |
| `npm run seed:big` | Same, but pads the roster to 70 employees — use only if your rubric literally requires 70 rows in every table |

The generator is seeded, so every group member gets identical data. Screenshots
from four different laptops will match.

Start the server:

```bash
npm run dev
```

Leave this terminal running. Confirm it works by opening
<http://localhost:5000/api/health> — you should see a small JSON response.

---

## Step 4 — Start the React client

Open a **second terminal**:

```bash
cd client
npm install
npm run dev
```

Open <http://localhost:5173>.

You do not need to configure anything here. Vite forwards every request that
starts with `/api` to the server on port 5000, so the browser only ever talks
to one origin.

---

## Step 5 — Log in and check it works

| Email | Password | What you should see |
|---|---|---|
| `manager@andoys.ph` | `andoys123` | Home with today's logs, plus a Dashboard tab in the sidebar |
| `antonio@andoys.ph` | `andoys123` | Home with his own job, no Dashboard tab |

A five-minute smoke test:

1. Log in as **antonio**, press **Clock in** on Home.
2. Go to **Schedule → Availability**, tap three days on the calendar.
3. Log out, log in as **manager**.
4. Go to **Dashboard → Logs** — Antonio's clock-in is there.
5. Go to **Schedule → Add job**, book something for one of Antonio's days and
   assign it to him.
6. Try to book a second job for Antonio on the same day. The system refuses and
   names the clashing job. That refusal is the conflict check working.
7. Log back in as Antonio — the new job is on his Home screen and there is a
   notification waiting.
8. Back as **manager**, open **Reports → Hours summary**, choose *This month*,
   and press **Download CSV**. A file lands in your downloads and opens in Excel.

If all eight steps behave, the system is installed correctly.

---

## Step 6 — Move to one shared database

Right now each group member has their own local database, so nobody can see
anybody else's data. MongoDB Atlas gives you one cluster the whole group points
at, free forever on the M0 tier.

**Do this once, as a group. One person creates it; everyone else joins.**

### 6.1 Create the cluster

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. Choose **M0 Free**, provider AWS, region **Singapore (ap-southeast-1)** —
   the closest to the Philippines, so the app feels faster.
3. Name the cluster `andoys-cluster`. Create it and wait about three minutes.

### 6.2 Create a database user

*Database Access → Add New Database User*

- Authentication: Password
- Username: `andoys_app`
- Password: press **Autogenerate**, then **copy it somewhere safe now** — Atlas
  will not show it again
- Role: **Read and write to any database**

### 6.3 Allow your computers to connect

*Network Access → Add IP Address*

For a school project, choose **Allow access from anywhere** (`0.0.0.0/0`).
Campus and home IPs change constantly and locking it down will only cost you an
evening of debugging. Note in your paper that a production deployment would
restrict this to the server's IP.

### 6.4 Get the connection string

*Database → Connect → Drivers → Node.js*. You get something like:

```
mongodb+srv://andoys_app:<db_password>@andoys-cluster.ab12c.mongodb.net/?retryWrites=true&w=majority
```

Two edits are required:

1. Replace `<db_password>` with the real password (no angle brackets).
2. Insert the database name `andoys` before the `?`.

Final form:

```
mongodb+srv://andoys_app:REALPASSWORD@andoys-cluster.ab12c.mongodb.net/andoys?retryWrites=true&w=majority
```

> If the password contains `@ : / ? # [ ] %`, URL-encode those characters or
> just regenerate a simpler password. A raw `@` in the password will break the
> connection string in a way that is genuinely annoying to diagnose.

### 6.5 Point everyone at it

Each member edits their own `server/.env`:

```ini
MONGODB_URI=mongodb+srv://andoys_app:REALPASSWORD@andoys-cluster.ab12c.mongodb.net/andoys?retryWrites=true&w=majority
```

Share the string over your group chat, **not** through the repository.

Then, **one person only**, seed the shared cluster:

```bash
cd server
npm run seed
```

Restart everyone's server (`npm run dev`). The startup line now reads
`connected to andoys (shared cluster)`. Two people logging in from two laptops
now see the same jobs, the same logs, the same staff list.

### 6.6 Confirm it is really shared

Have one member create a job. Have another refresh their Schedule page. If the
job appears, you are on one database.

---

## Step 7 — Deploy (optional, for the demo)

You do not need this to pass, but a live URL is easier to demo than two
terminals.

**API on Render** (free tier)

1. Push the repo to GitHub.
2. Render → New → Web Service → connect the repo.
3. Root directory `server`, build `npm install`, start `npm start`.
4. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`
   (your Vercel URL), `MANAGER_INVITE_CODE`.

**Client on Vercel**

1. Vercel → New Project → same repo.
2. Root directory `client`, framework Vite.
3. Environment variable `VITE_API_URL` = your Render URL, e.g.
   `https://andoys-api.onrender.com`.

Deploy the API first so you know its URL, then the client, then go back and set
`CLIENT_ORIGIN` on Render.

> Render's free tier sleeps after 15 minutes idle. Open the site a minute before
> your demo so the first request is not a 40-second cold start.

---

## Troubleshooting

| What you see | What it means | Fix |
|---|---|---|
| `MONGODB_URI is not set` | No `.env` file | Copy `.env.example` to `.env` |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running | Go back to Step 2 |
| `querySrv ENOTFOUND` | Atlas string is malformed | Re-copy it; check `mongodb+srv://` and the database name |
| `bad auth : authentication failed` | Wrong password in the URI | Regenerate the Atlas password, avoid special characters |
| `Could not connect to any servers` on Atlas | Your IP is not allowed | Network Access → add `0.0.0.0/0` |
| Client loads but every request fails | API is not running | Check the server terminal |
| `Port 5000 is already in use` | Something else has the port | Change `PORT` in `.env`, and the proxy target in `client/vite.config.js` |
| Logged in but immediately bounced out | `JWT_SECRET` changed after you logged in | Log out and back in |
| `npm install` fails on Node 16 | Node is too old | Install Node 18 LTS or newer |

---

## Daily routine after setup

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

That is all. `npm install` only needs re-running when someone adds a dependency.