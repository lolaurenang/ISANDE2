/**
 * Seed script - fills an empty database with the staff, jobs and logs
 * from the ISANDE1 prototype so the app has something to show on the
 * first run and during the demo.
 *
 *   npm run seed          add demo data (skips if users already exist)
 *   npm run seed:reset    wipe the collections first, then add
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

const staff = [
  { fullName: 'Alen Mariano D. Garcia', email: 'manager@andoys.ph', role: 'manager', jobTitle: 'Manager', department: 'Management', phone: '0997 123 4567' },
  { fullName: 'John dela Cruz', email: 'john@andoys.ph', role: 'mechanic', jobTitle: 'Mechanic', department: 'Mechanic', phone: '0912 111 2222' },
  { fullName: 'Mark Perez', email: 'mark@andoys.ph', role: 'mechanic', jobTitle: 'Mechanic', department: 'Mechanic', phone: '0912 333 4444' },
  { fullName: 'Antonio Santos', email: 'antonio@andoys.ph', role: 'mechanic', jobTitle: 'Mechanic', department: 'Mechanic', phone: '0992 123 4567' },
  { fullName: 'Alex Reyes', email: 'alex@andoys.ph', role: 'staff', jobTitle: 'Driver', department: 'Others', phone: '0912 555 6666' },
  { fullName: 'Charmaine Lim', email: 'charmaine@andoys.ph', role: 'staff', jobTitle: 'Cashier', department: 'Sales', phone: '0912 777 8888' },
];

const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
};

async function run() {
  await connectDB();

  if (RESET) {
    await Promise.all([
      User.deleteMany({}),
      ServiceJob.deleteMany({}),
      Attendance.deleteMany({}),
      ActivityLog.deleteMany({}),
      Availability.deleteMany({}),
      Notification.deleteMany({}),
      ShiftRequest.deleteMany({}),
    ]);
    console.log('[seed] collections cleared');
  }

  if ((await User.countDocuments()) > 0) {
    console.log('[seed] database already has users - run "npm run seed:reset" to start over');
    await disconnectDB();
    return;
  }

  // User.create() runs the pre-save hook, so passwords are hashed.
  const created = await User.create(staff.map((s) => ({ ...s, password: PASSWORD })));
  const byEmail = Object.fromEntries(created.map((u) => [u.email, u]));
  const manager = byEmail['manager@andoys.ph'];
  console.log(`[seed] ${created.length} accounts created (password: ${PASSWORD})`);

  await ServiceJob.create([
    {
      title: 'Motorcycle Repair',
      description: 'Inspect and replace the damaged clutch cable to restore smooth gear shifting.',
      serviceType: 'motorcycle-repair',
      clientName: 'Ramon Villareal',
      startDate: dayOffset(0),
      endDate: dayOffset(2),
      assignedTo: byEmail['antonio@andoys.ph']._id,
      createdBy: manager._id,
      status: 'in-progress',
      priority: 'high',
    },
    {
      title: 'Bike Repair',
      description: 'Tighten the loose brake cables and adjust the brake pads for proper alignment.',
      serviceType: 'bike-repair',
      clientName: 'Liza Gamboa',
      startDate: dayOffset(3),
      endDate: dayOffset(3),
      assignedTo: byEmail['john@andoys.ph']._id,
      createdBy: manager._id,
    },
    {
      title: 'Motorcycle Repair',
      description: 'Replace a worn-out clutch lever and bleed the clutch fluid to restore proper engagement.',
      serviceType: 'motorcycle-repair',
      clientName: 'Dodong Serrano',
      startDate: dayOffset(4),
      endDate: dayOffset(4),
      assignedTo: byEmail['mark@andoys.ph']._id,
      createdBy: manager._id,
    },
    {
      title: 'Suppliers Delivery',
      description: 'Receive and verify the Shell and Castrol oil delivery against the purchase order.',
      serviceType: 'supplier-delivery',
      startDate: dayOffset(5),
      endDate: dayOffset(5),
      assignedTo: byEmail['alex@andoys.ph']._id,
      createdBy: manager._id,
    },
    {
      title: 'Engine Tune-up',
      description: 'Full tune-up and fuel injection cleaning for a tricycle unit.',
      serviceType: 'engine-tuneup',
      startDate: dayOffset(6),
      endDate: dayOffset(6),
      assignedTo: null, // open job - shows up in the unassigned pool
      createdBy: manager._id,
      priority: 'low',
    },
  ]);
  console.log('[seed] 5 service jobs created');

  const today = toDateKey();
  const at = (h, m) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  await Attendance.create([
    { employee: byEmail['john@andoys.ph']._id, workDate: today, clockIn: at(9, 31), status: 'late' },
    { employee: byEmail['mark@andoys.ph']._id, workDate: today, clockIn: at(7, 55), clockOut: at(16, 45), minutesWorked: 530 },
    { employee: byEmail['antonio@andoys.ph']._id, workDate: today, clockIn: at(8, 5), status: 'present' },
  ]);

  await ActivityLog.create([
    { employee: byEmail['john@andoys.ph']._id, type: 'clock-in', message: 'Logged in on-duty', loggedAt: at(9, 31) },
    { employee: byEmail['mark@andoys.ph']._id, type: 'work', message: 'Repaired wheels', work: 'Repaired wheels', clientName: 'Horse', loggedAt: at(11, 45) },
    { employee: byEmail['alex@andoys.ph']._id, type: 'clock-out', message: 'Signed out', loggedAt: at(16, 45) },
  ]);
  console.log('[seed] attendance and activity logs created');

  const availability = [];
  for (const email of ['john@andoys.ph', 'mark@andoys.ph', 'antonio@andoys.ph']) {
    for (let i = 0; i < 14; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (d.getDay() === 0) continue; // shop closed on Sundays
      availability.push({ employee: byEmail[email]._id, workDate: toDateKey(d) });
    }
  }
  await Availability.insertMany(availability);
  console.log(`[seed] ${availability.length} availability slots created`);

  await ShiftRequest.create({
    requestedBy: byEmail['john@andoys.ph']._id,
    type: 'leave',
    workDate: toDateKey(dayOffset(7)),
    reason: 'Family obligation in Iloilo, back the next day.',
  });

  await Notification.create({
    recipient: manager._id,
    title: 'Shift request waiting',
    message: 'John dela Cruz requested leave on ' + toDateKey(dayOffset(7)),
    type: 'request',
  });

  console.log('\n[seed] done. Log in with:');
  console.log('  manager@andoys.ph  / andoys123   (manager)');
  console.log('  antonio@andoys.ph  / andoys123   (mechanic)\n');

  await disconnectDB();
}

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});
