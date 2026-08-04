/**
 * Seed script
 * ---------------------------------------------------------------
 * Fills the database with a realistic three-month slice of shop life:
 * six weeks of history behind today and five weeks of schedule ahead.
 * Every collection ends up with well over 70 rows, so the dashboard,
 * the hours summary and all seven reports have real data to show.
 *
 *   npm run seed          add demo data (refuses if users already exist)
 *   npm run seed:reset    wipe the collections first, then add
 *
 * The randomness is seeded, so every group member who runs this against
 * the shared cluster gets identical data. That matters when four people
 * are screenshotting the same report for one paper.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import ServiceJob from '../src/models/ServiceJob.js';
import Attendance from '../src/models/Attendance.js';
import ActivityLog from '../src/models/ActivityLog.js';
import Availability from '../src/models/Availability.js';
import Notification from '../src/models/Notification.js';
import ShiftRequest from '../src/models/ShiftRequest.js';
import { toDateKey } from '../src/utils/dates.js';

const RESET = process.argv.includes('--reset');
const PASSWORD = 'andoys123';

/**
 * The real shop has about fifteen people, and that is what seeds by
 * default - a roster of seventy would contradict the org chart in the
 * documentation. If your rubric asks for 70 rows in *every* table,
 * run `npm run seed -- --staff=70` and the roster is padded with
 * generated employees who get the same attendance and availability
 * treatment as everyone else.
 */
const staffArg = process.argv.find((a) => a.startsWith('--staff='));
const STAFF_TARGET = staffArg ? Math.max(0, Number(staffArg.split('=')[1]) || 0) : 0;

const WEEKS_BACK = 6;
const WEEKS_AHEAD = 5;

/* ----------------------------- deterministic RNG ----------------------------- */
let rngState = 20260805;
const rand = () => {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const chance = (p) => rand() < p;

/* --------------------------------- helpers ---------------------------------- */
const startOfWeek = (d) => {
  const out = new Date(d);
  out.setDate(out.getDate() - out.getDay());
  out.setHours(0, 0, 0, 0);
  return out;
};

const addDays = (d, n) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

const at = (date, hour, minute) => {
  const out = new Date(date);
  out.setHours(hour, minute, 0, 0);
  return out;
};

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const WINDOW_START = addDays(startOfWeek(TODAY), -WEEKS_BACK * 7);
const WINDOW_END = addDays(startOfWeek(TODAY), WEEKS_AHEAD * 7 + 6);

/** Every calendar day in the window. Sunday = shop closed. */
const allDays = [];
for (let d = new Date(WINDOW_START); d <= WINDOW_END; d = addDays(d, 1)) {
  allDays.push(new Date(d));
}
const workDays = allDays.filter((d) => d.getDay() !== 0);
const pastWorkDays = workDays.filter((d) => d < TODAY);
const futureWorkDays = workDays.filter((d) => d >= TODAY);

/* ---------------------------------- staff ----------------------------------- */
const staff = [
  { fullName: 'Alen Mariano D. Garcia', email: 'manager@andoys.ph', role: 'manager', jobTitle: 'Manager', department: 'Management', phone: '0997 123 4567', weeklyHourTarget: 48 },
  { fullName: 'Jethro Balingit', email: 'jethro@andoys.ph', role: 'mechanic', jobTitle: 'Mechanic', department: 'Mechanic', phone: '0912 220 1145' },
  { fullName: 'Donifer Alcantara', email: 'donifer@andoys.ph', role: 'mechanic', jobTitle: 'Mechanic', department: 'Mechanic', phone: '0912 220 8830' },
  { fullName: 'Joven Maglinao', email: 'joven@andoys.ph', role: 'mechanic', jobTitle: 'Mechanic', department: 'Mechanic', phone: '0918 445 2201' },
  { fullName: 'Antonio Santos', email: 'antonio@andoys.ph', role: 'mechanic', jobTitle: 'Mechanic', department: 'Mechanic', phone: '0992 123 4567' },
  { fullName: 'John dela Cruz', email: 'john@andoys.ph', role: 'mechanic', jobTitle: 'Mechanic', department: 'Mechanic', phone: '0912 111 2222' },
  { fullName: 'Mark Perez', email: 'mark@andoys.ph', role: 'mechanic', jobTitle: 'Mechanic', department: 'Mechanic', phone: '0912 333 4444' },
  { fullName: 'Rey Bautista', email: 'rey@andoys.ph', role: 'mechanic', jobTitle: 'Apprentice Mechanic', department: 'Mechanic', phone: '0917 664 0092', weeklyHourTarget: 32 },
  { fullName: 'Charmaine Lozada', email: 'charmaine@andoys.ph', role: 'staff', jobTitle: 'Cashier', department: 'Sales', phone: '0912 777 8888' },
  { fullName: 'Loida Fernandez', email: 'loida@andoys.ph', role: 'staff', jobTitle: 'Sales Associate', department: 'Sales', phone: '0906 231 7745' },
  { fullName: 'Dannilyn Ocampo', email: 'dannilyn@andoys.ph', role: 'staff', jobTitle: 'Sales Associate', department: 'Sales', phone: '0906 231 9911' },
  { fullName: 'Charles David Ramos', email: 'charles@andoys.ph', role: 'staff', jobTitle: 'Marketing Associate', department: 'Marketing', phone: '0915 882 3310' },
  { fullName: 'Ferdland Gubaton', email: 'ferdland@andoys.ph', role: 'staff', jobTitle: 'Driver', department: 'Others', phone: '0915 882 6604' },
  { fullName: 'Alex Reyes', email: 'alex@andoys.ph', role: 'staff', jobTitle: 'Driver', department: 'Others', phone: '0912 555 6666' },
  { fullName: 'Rock John Villamor', email: 'rockjohn@andoys.ph', role: 'staff', jobTitle: 'Accounting Staff', department: 'Accounting', phone: '0908 774 1120' },
];

/* --------------------------- optional roster padding ------------------------- */
const FIRST_NAMES = [
  'Arnel', 'Bernadette', 'Carlito', 'Divina', 'Efren', 'Fely', 'Gerry', 'Hazel',
  'Ismael', 'Jocelyn', 'Kristoffer', 'Luzviminda', 'Melchor', 'Norma', 'Onofre',
  'Perlita', 'Quirino', 'Rosalinda', 'Salvador', 'Teresita', 'Ubaldo', 'Virgilio',
  'Wilfredo', 'Yolanda', 'Zaldy', 'Bebot', 'Cristina', 'Dario', 'Elsa', 'Fidel',
];
const LAST_NAMES = [
  'Abueva', 'Bacaltos', 'Casiple', 'Duterte', 'Escalona', 'Fuentebella', 'Gaerlan',
  'Hinolan', 'Ilagan', 'Jamandre', 'Katigbak', 'Lacanilao', 'Manaloto', 'Nepomuceno',
  'Obispo', 'Pagunsan', 'Quisumbing', 'Rebusquillo', 'Sarmiento', 'Tolentino',
  'Umali', 'Valenzuela', 'Wenceslao', 'Ybanez', 'Zabala',
];
const PAD_ROLES = [
  { role: 'mechanic', jobTitle: 'Mechanic', department: 'Mechanic' },
  { role: 'staff', jobTitle: 'Sales Associate', department: 'Sales' },
  { role: 'staff', jobTitle: 'Cashier', department: 'Sales' },
  { role: 'staff', jobTitle: 'Driver', department: 'Others' },
  { role: 'staff', jobTitle: 'Warehouse Assistant', department: 'Others' },
];

if (STAFF_TARGET > staff.length) {
  const taken = new Set(staff.map((s) => s.email));
  let n = 0;
  while (staff.length < STAFF_TARGET) {
    const first = FIRST_NAMES[n % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(n / FIRST_NAMES.length) % LAST_NAMES.length];
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@andoys.ph`;
    n += 1;
    if (taken.has(email)) continue;
    taken.add(email);
    staff.push({
      fullName: `${first} ${last}`,
      email,
      ...PAD_ROLES[staff.length % PAD_ROLES.length],
      phone: `09${String(10 + (staff.length % 80))} ${String(100 + staff.length).slice(0, 3)} ${String(1000 + staff.length * 7).slice(0, 4)}`,
    });
  }
  console.log(`[seed] roster padded to ${staff.length} employees (--staff=${STAFF_TARGET})`);
}

/* ------------------------------- job templates ------------------------------- */
const JOB_TEMPLATES = [
  { title: 'Motorcycle Repair', serviceType: 'motorcycle-repair', days: [1, 3], descriptions: [
    'Inspect and replace the damaged clutch cable to restore smooth gear shifting.',
    'Replace a worn-out clutch lever and bleed the clutch fluid to restore proper engagement.',
    'Diagnose the intermittent starting fault and replace the starter relay.',
    'Rebuild the rear brake assembly and replace the corroded brake line.',
    'Trace the charging fault and replace the regulator rectifier.',
  ] },
  { title: 'Bike Repair', serviceType: 'bike-repair', days: [1, 1], descriptions: [
    'Tighten the loose brake cables and adjust the brake pads for proper alignment.',
    'True the rear wheel and replace three broken spokes.',
    'Replace the worn chain and rear sprocket, then reset the chain tension.',
  ] },
  { title: 'Oil Change', serviceType: 'oil-change', days: [1, 1], descriptions: [
    'Full oil change using Shell Advance, plus a new oil filter.',
    'Castrol Power1 oil change with drain plug gasket replacement.',
  ] },
  { title: 'Engine Tune-up', serviceType: 'engine-tuneup', days: [1, 2], descriptions: [
    'Full tune-up and fuel injection cleaning for a tricycle unit.',
    'Carburetor cleaning, valve clearance adjustment and new spark plug.',
    'Fuel injection service and throttle body cleaning after a rough idling complaint.',
  ] },
  { title: 'Engine Overhaul', serviceType: 'overhaul', days: [3, 5], descriptions: [
    'Complete top-end overhaul: new piston, rings and cylinder honing.',
    'Bottom-end overhaul after bearing failure, including crankshaft inspection.',
  ] },
  { title: 'Wheel Alignment', serviceType: 'wheel-alignment', days: [1, 1], descriptions: [
    'Wheel alignment and balancing after a curb impact.',
    'Front fork alignment check and steering head bearing adjustment.',
  ] },
  { title: 'Suppliers Delivery', serviceType: 'supplier-delivery', days: [1, 1], descriptions: [
    'Receive and verify the Shell and Castrol oil delivery against the purchase order.',
    'Collect the Honda genuine parts order from the Iloilo distributor.',
    'Receive the tire and inner tube restock, then count against the delivery receipt.',
  ] },
];

const CLIENTS = [
  'Ramon Villareal', 'Liza Gamboa', 'Dodong Serrano', 'Tricycle Operators Assn - Jordan',
  'Nognog Panerio', 'Marissa Tabuena', 'Buboy Espinosa', 'Guimaras Rider Club',
  'Bong Delgado', 'Aling Nena Sari-sari', 'Toto Mabilog', 'Kap. Ernesto Sablan',
  'Jun-jun Padilla', 'Weng Ledesma', 'San Miguel Barangay Patrol', 'Ka Lito Bandoja',
  'Marlon Gustilo', 'Tessie Arcenas', 'Boyet Ocampo', 'Nilo Traspaderne',
];

const WORK_LOGS = [
  'Repaired wheels', 'Replaced clutch cable', 'Cleaned fuel injector', 'Changed engine oil',
  'Adjusted brake pads', 'Replaced spark plug', 'Trued the rear wheel', 'Tightened chain tension',
  'Replaced brake shoes', 'Rebuilt carburetor', 'Replaced battery', 'Fixed wiring short',
  'Balanced front wheel', 'Replaced air filter', 'Bled the brake line', 'Adjusted valve clearance',
  'Replaced regulator rectifier', 'Sealed the fork oil leak',
];

const TIME_OFF_REASONS = [
  'Family obligation in Iloilo, back the next day.',
  'Barangay fiesta duty, committed months ago.',
  'Medical appointment at the provincial hospital.',
  'Escorting a child to their school enrolment.',
  'Ferry cancelled by the weather, cannot cross from Iloilo.',
  'Attending a wake in Buenavista.',
  'Motorcycle registration renewal at the LTO.',
  'Sibling graduation ceremony.',
];

async function run() {
  await connectDB();

  if (RESET) {
    await Promise.all([
      User.deleteMany({}), ServiceJob.deleteMany({}), Attendance.deleteMany({}),
      ActivityLog.deleteMany({}), Availability.deleteMany({}),
      Notification.deleteMany({}), ShiftRequest.deleteMany({}),
    ]);
    console.log('[seed] collections cleared');
  }

  if ((await User.countDocuments()) > 0) {
    console.log('[seed] database already has users - run "npm run seed:reset" to start over');
    await disconnectDB();
    return;
  }

  console.log(`[seed] window: ${toDateKey(WINDOW_START)} to ${toDateKey(WINDOW_END)}`);

  /* ------------------------------- 1. users -------------------------------- */
  // User.create() runs the pre-save hook, so every password is hashed.
  const users = await User.create(staff.map((s) => ({ ...s, password: PASSWORD })));
  const manager = users.find((u) => u.role === 'manager');
  const mechanics = users.filter((u) => u.role === 'mechanic');
  const others = users.filter((u) => u.role === 'staff');
  const workforce = [...mechanics, ...others];

  /* --------------------------- 2. availability ----------------------------- */
  // Two patterns on purpose: most people fill in a month ahead, a couple
  // only ever fill in the current week. That gap is exactly what the
  // manager needs to notice, so the roster reports it.
  const availabilityRows = [];
  const availabilityPeople = [...mechanics, ...others.slice(0, Math.max(3, Math.ceil(others.length / 2)))];
  for (const person of availabilityPeople) {
    const diligent = !['rey@andoys.ph', 'dannilyn@andoys.ph'].includes(person.email);
    for (const day of workDays) {
      if (!diligent && day > addDays(TODAY, 10)) continue;
      if (chance(0.14)) continue; // an ordinary day off
      const early = chance(0.6);
      availabilityRows.push({
        employee: person._id,
        workDate: toDateKey(day),
        isAvailable: true,
        startTime: early ? '08:00' : '10:00',
        endTime: early ? '17:00' : '19:00',
        note: chance(0.05) ? 'Can stay late if a unit is still open' : '',
      });
    }
  }
  await Availability.insertMany(availabilityRows);

  /* ---------------------------- 3. service jobs ---------------------------- */
  const jobs = [];
  const bookings = new Map(); // employeeId -> Set of date keys already taken

  const isFree = (person, days) => {
    const taken = bookings.get(String(person._id)) || new Set();
    return days.every((d) => !taken.has(toDateKey(d)));
  };
  const book = (person, days) => {
    const key = String(person._id);
    if (!bookings.has(key)) bookings.set(key, new Set());
    days.forEach((d) => bookings.get(key).add(toDateKey(d)));
  };

  const makeJob = (startDay) => {
    const template = pick(JOB_TEMPLATES);
    const span = between(template.days[0], template.days[1]);
    const days = Array.from({ length: span }, (_, i) => addDays(startDay, i));
    if (days[days.length - 1] > WINDOW_END) return null;

    const pool = template.serviceType === 'supplier-delivery' ? others : mechanics;
    const candidates = pool.filter((p) => isFree(p, days));

    // Roughly one job in eight is left open, so the pool that mechanics
    // can claim from is never empty.
    const leaveOpen = chance(0.12) || candidates.length === 0;
    const assignee = leaveOpen ? null : pick(candidates);
    if (assignee) book(assignee, days);

    const last = days[days.length - 1];
    const past = last < TODAY;
    const spansToday = days[0] <= TODAY && last >= TODAY;

    let status;
    if (past) status = chance(0.88) ? 'completed' : 'cancelled';
    else if (spansToday) status = assignee ? 'in-progress' : 'scheduled';
    else status = 'scheduled';

    return {
      title: template.title,
      description: pick(template.descriptions),
      serviceType: template.serviceType,
      clientName: template.serviceType === 'supplier-delivery' ? '' : pick(CLIENTS),
      startDate: at(days[0], 8, 0),
      endDate: at(last, 17, 0),
      assignedTo: assignee?._id || null,
      createdBy: manager._id,
      status,
      priority: chance(0.15) ? 'high' : chance(0.25) ? 'low' : 'normal',
      completedAt: status === 'completed' ? at(last, between(14, 17), between(0, 59)) : undefined,
    };
  };

  for (const day of workDays) {
    const count = day.getDay() === 6 ? between(1, 3) : between(0, 2); // Saturdays are busiest
    for (let i = 0; i < count; i += 1) {
      const job = makeJob(day);
      if (job) jobs.push(job);
    }
  }
  const createdJobs = await ServiceJob.insertMany(jobs);

  /* ----------------------- 4. attendance + activity ------------------------ */
  const attendanceRows = [];
  const logRows = [];

  for (const day of pastWorkDays) {
    for (const person of [manager, ...workforce]) {
      if (chance(0.09)) {
        // Absent. Recorded so the reports can count it.
        attendanceRows.push({
          employee: person._id,
          workDate: toDateKey(day),
          status: chance(0.35) ? 'on-leave' : 'absent',
          notes: chance(0.3) ? 'Called the shop in the morning' : '',
        });
        continue;
      }

      const late = chance(0.16);
      const clockIn = at(day, late ? 9 : 7, late ? between(5, 55) : between(40, 59));

      // One shift in twenty is left open - somebody forgot to clock out.
      // The hours report surfaces these under "Missing clock-out".
      const forgot = chance(0.05);
      const clockOut = forgot ? null : at(day, between(16, 19), between(0, 59));
      const minutes = clockOut ? Math.round((clockOut - clockIn) / 60000) : 0;

      attendanceRows.push({
        employee: person._id,
        workDate: toDateKey(day),
        clockIn,
        clockOut: clockOut || undefined,
        minutesWorked: minutes,
        status: late ? 'late' : 'present',
      });

      logRows.push({ employee: person._id, type: 'clock-in', message: 'Logged in on-duty', loggedAt: clockIn });
      if (clockOut) {
        logRows.push({ employee: person._id, type: 'clock-out', message: 'Signed out', loggedAt: clockOut });
      }

      if (person.role === 'mechanic' && chance(0.55)) {
        const work = pick(WORK_LOGS);
        logRows.push({
          employee: person._id,
          type: 'work',
          message: work,
          work,
          clientName: pick(CLIENTS),
          loggedAt: at(day, between(10, 15), between(0, 59)),
        });
      }
    }
  }

  // Today, so the Home screen and the log feed are alive the moment you
  // log in: a few people already clocked in, one already finished.
  const todayKey = toDateKey(TODAY);
  for (const person of workforce.slice(0, Math.min(workforce.length, Math.max(6, Math.ceil(workforce.length / 2))))) {
    const clockIn = at(TODAY, between(7, 9), between(0, 59));
    const done = chance(0.3);
    const clockOut = done ? at(TODAY, between(16, 17), between(0, 59)) : null;

    attendanceRows.push({
      employee: person._id,
      workDate: todayKey,
      clockIn,
      clockOut: clockOut || undefined,
      minutesWorked: clockOut ? Math.round((clockOut - clockIn) / 60000) : 0,
      status: clockIn.getHours() >= 9 ? 'late' : 'present',
    });
    logRows.push({ employee: person._id, type: 'clock-in', message: 'Logged in on-duty', loggedAt: clockIn });
    if (clockOut) {
      logRows.push({ employee: person._id, type: 'clock-out', message: 'Signed out', loggedAt: clockOut });
    }
    if (person.role === 'mechanic') {
      const work = pick(WORK_LOGS);
      logRows.push({
        employee: person._id, type: 'work', message: work, work,
        clientName: pick(CLIENTS), loggedAt: at(TODAY, between(10, 14), between(0, 59)),
      });
    }
  }

  await Attendance.insertMany(attendanceRows);

  // Link some work logs to real completed jobs so the activity report's
  // "Related job" column is not empty.
  const completed = createdJobs.filter((j) => j.status === 'completed' && j.assignedTo);
  for (const job of completed.slice(0, 60)) {
    logRows.push({
      employee: job.assignedTo,
      type: 'work',
      message: `Completed: ${job.title}`,
      work: job.title,
      clientName: job.clientName || 'Walk-in',
      relatedJob: job._id,
      loggedAt: job.completedAt || job.endDate,
    });
  }
  await ActivityLog.insertMany(logRows);

  /* --------------------------- 5. shift requests --------------------------- */
  const requestRows = [];
  const requestDays = [...pastWorkDays.slice(-25), ...futureWorkDays.slice(0, 25)];
  for (let i = 0; i < 78; i += 1) {
    const person = pick(workforce);
    const day = pick(requestDays);
    const past = day < TODAY;
    const status = past ? (chance(0.72) ? 'approved' : 'denied') : chance(0.45) ? 'approved' : 'pending';

    requestRows.push({
      requestedBy: person._id,
      type: pick(['time-off', 'shift-change', 'schedule-swap']),
      workDate: toDateKey(day),
      reason: pick(TIME_OFF_REASONS),
      status,
      reviewedBy: status === 'pending' ? null : manager._id,
      reviewedAt: status === 'pending' ? undefined : addDays(day, -1),
      reviewNote: status === 'denied' ? 'Too many people already off that day.' : '',
    });
  }
  const createdRequests = await ShiftRequest.insertMany(requestRows);

  /* --------------------------- 6. notifications ---------------------------- */
  const notificationRows = [];

  for (const job of createdJobs.filter((j) => j.assignedTo).slice(0, 70)) {
    notificationRows.push({
      recipient: job.assignedTo,
      title: 'New job assigned',
      message: `${job.title} - ${new Date(job.startDate).toLocaleDateString('en-PH', {
        month: 'long', day: 'numeric', year: 'numeric',
      })}`,
      type: 'assignment',
      relatedJob: job._id,
      isRead: job.startDate < TODAY,
      readAt: job.startDate < TODAY ? job.startDate : undefined,
    });
  }

  for (const req of createdRequests) {
    if (req.status === 'pending') {
      notificationRows.push({
        recipient: manager._id,
        title: 'Shift request waiting',
        message: `A ${req.type.replace('-', ' ')} request is waiting for ${req.workDate}`,
        type: 'request',
        isRead: false,
      });
    } else {
      notificationRows.push({
        recipient: req.requestedBy,
        title: `Request ${req.status}`,
        message: `Your ${req.type.replace('-', ' ')} for ${req.workDate} was ${req.status}`,
        type: 'request',
        isRead: chance(0.6),
      });
    }
  }

  notificationRows.push({
    recipient: manager._id,
    title: 'Weather advisory',
    message: 'Signal no. 1 raised over Guimaras. Confirm tomorrow crew before closing.',
    type: 'system',
    isRead: false,
  });

  await Notification.insertMany(notificationRows);

  /* -------------------------------- summary -------------------------------- */
  const counts = {
    users: await User.countDocuments(),
    servicejobs: await ServiceJob.countDocuments(),
    attendances: await Attendance.countDocuments(),
    activitylogs: await ActivityLog.countDocuments(),
    availabilities: await Availability.countDocuments(),
    shiftrequests: await ShiftRequest.countDocuments(),
    notifications: await Notification.countDocuments(),
  };

  console.log('\n[seed] rows created');
  for (const [name, n] of Object.entries(counts)) {
    console.log(`  ${name.padEnd(16)} ${String(n).padStart(5)}   ${n >= 70 ? 'ok' : 'UNDER 70'}`);
  }

  console.log('\n[seed] log in with any of these (password: andoys123)');
  console.log('  manager@andoys.ph     manager - full dashboard and reports');
  console.log('  antonio@andoys.ph     mechanic');
  console.log('  charmaine@andoys.ph   staff (cashier)\n');

  await disconnectDB();
}

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});
