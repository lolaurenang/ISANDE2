/**
 * Seed script - fills an empty database with staff, jobs, attendance,
 * availability, logs, notifications, and leave requests for demo use.
 *
 *   npm run seed
 *   npm run seed:reset
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
  {
    fullName: 'Andro Von Galon',
    email: 'manager@andoys.ph',
    role: 'manager',
    jobTitle: 'Owner/Manager',
    department: 'Management',
    phone: '0917 100 0001',
  },
  {
    fullName: 'Charmaine',
    email: 'charmaine@andoys.ph',
    role: 'staff',
    jobTitle: 'Cashier',
    department: 'Sales',
    phone: '0917 100 0002',
  },
  {
    fullName: 'Loida',
    email: 'loida@andoys.ph',
    role: 'staff',
    jobTitle: 'Sales Associate',
    department: 'Sales',
    phone: '0917 100 0003',
  },
  {
    fullName: 'Dannilyn',
    email: 'dannilyn@andoys.ph',
    role: 'staff',
    jobTitle: 'Sales Associate',
    department: 'Sales',
    phone: '0917 100 0004',
  },
  {
    fullName: 'Charles David',
    email: 'charlesdavid@andoys.ph',
    role: 'staff',
    jobTitle: 'Marketing Associate',
    department: 'Marketing',
    phone: '0917 100 0005',
  },
  {
    fullName: 'Ferdiand',
    email: 'ferdiand@andoys.ph',
    role: 'staff',
    jobTitle: 'Driver',
    department: 'Marketing',
    phone: '0917 100 0006',
  },
  {
    fullName: 'Jethro',
    email: 'jethro@andoys.ph',
    role: 'mechanic',
    jobTitle: 'Mechanic',
    department: 'Mechanic',
    phone: '0917 100 0007',
  },
  {
    fullName: 'Donifer',
    email: 'donifer@andoys.ph',
    role: 'mechanic',
    jobTitle: 'Mechanic',
    department: 'Mechanic',
    phone: '0917 100 0008',
  },
  {
    fullName: 'Joven',
    email: 'joven@andoys.ph',
    role: 'mechanic',
    jobTitle: 'Mechanic',
    department: 'Mechanic',
    phone: '0917 100 0009',
  },
  {
    fullName: 'Rock John',
    email: 'rockjohn@andoys.ph',
    role: 'staff',
    jobTitle: 'Accounting Staff',
    department: 'Accounting',
    phone: '0917 100 0010',
  },
];

const mechanicEmails = ['jethro@andoys.ph', 'donifer@andoys.ph', 'joven@andoys.ph'];

const clients = [
  'Ramon Villareal',
  'Liza Gamboa',
  'Dodong Serrano',
  'Marlon Dela Peña',
  'Crisanto Neri',
  'Benedicto Alonzo',
  'Arnel Cabrera',
  'Jasper Medina',
  'Julius Salazar',
  'Orlando Tapia',
  'Nestor Quinto',
  'Rafael Buan',
  'Isidro Mercado',
  'Leo Bautista',
  'Jomar Reyes',
  'Alvin Torres',
  'Edwin Castillo',
  'Rico Navarro',
];

const serviceTemplates = [
  {
    title: 'Motorcycle Repair',
    serviceType: 'motorcycle-repair',
    description: 'Inspect the clutch assembly, replace worn components, and test road performance.',
    priority: 'high',
  },
  {
    title: 'Bike Repair',
    serviceType: 'bike-repair',
    description: 'Adjust the brakes, true the wheels, and secure loose bolts for safe riding.',
    priority: 'normal',
  },
  {
    title: 'Engine Tune-up',
    serviceType: 'engine-tuneup',
    description: 'Perform a full tune-up, clean the fuel system, and verify engine timing.',
    priority: 'high',
  },
  {
    title: 'Motorcycle Repair',
    serviceType: 'motorcycle-repair',
    description: 'Replace worn brake pads, inspect the rotor, and recheck brake response.',
    priority: 'normal',
  },
  {
    title: 'Bike Repair',
    serviceType: 'bike-repair',
    description: 'Repair punctured tubes, align the handlebars, and check tire pressure.',
    priority: 'low',
  },
  {
    title: 'Engine Tune-up',
    serviceType: 'engine-tuneup',
    description: 'Clean the carburetor and spark plugs, then test idle smoothness.',
    priority: 'normal',
  },
  {
    title: 'Supplier Delivery',
    serviceType: 'supplier-delivery',
    description: 'Receive and verify spare parts delivery, then record the items against the order.',
    priority: 'low',
  },
  {
    title: 'Motorcycle Repair',
    serviceType: 'motorcycle-repair',
    description: 'Fix chain slack, lubricate the drivetrain, and check gear shifting.',
    priority: 'high',
  },
  {
    title: 'Bike Repair',
    serviceType: 'bike-repair',
    description: 'Inspect the frame, adjust the seat post, and tighten the pedal assembly.',
    priority: 'normal',
  },
  {
    title: 'Engine Tune-up',
    serviceType: 'engine-tuneup',
    description: 'Conduct a preventive maintenance check and confirm the fuel injection response.',
    priority: 'high',
  },
  {
    title: 'Supplier Delivery',
    serviceType: 'supplier-delivery',
    description: 'Sort received stock, verify quantities, and prepare items for storage.',
    priority: 'normal',
  },
  {
    title: 'Motorcycle Repair',
    serviceType: 'motorcycle-repair',
    description: 'Diagnose unusual engine noise and replace damaged bearings if needed.',
    priority: 'high',
  },
];

const dayOffset = (base, n) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};

const setTime = (date, h, m) => {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};

const isSunday = (date) => date.getDay() === 0;

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

  const createdUsers = await User.create(
    staff.map((s) => ({
      ...s,
      password: PASSWORD,
    }))
  );

  const byEmail = Object.fromEntries(createdUsers.map((u) => [u.email, u]));
  const manager = byEmail['manager@andoys.ph'];

  console.log(`[seed] ${createdUsers.length} accounts created (password: ${PASSWORD})`);

const taskBase = new Date('2026-05-02T09:00:00');
const endMonth = new Date('2026-08-31T17:00:00');

const jobs = [];
let currentDate = new Date(taskBase);
let counter = 0;

while (currentDate <= endMonth) {

  // Skip Sundays
  if (currentDate.getDay() !== 0) {

    // 1–3 jobs every working day
    const jobsToday = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < jobsToday; j++) {

      const template = serviceTemplates[counter % serviceTemplates.length];
      const mechanicEmail = mechanicEmails[counter % mechanicEmails.length];
      const clientName = clients[counter % clients.length];

      const startDate = new Date(currentDate);

      const endDate = new Date(startDate);
      if (Math.random() < 0.2) {
        endDate.setDate(endDate.getDate() + 1);
      }

      jobs.push({
        title: `${template.title} \n- ${clientName}`,
        description: template.description,
        serviceType: template.serviceType,
        clientName,
        startDate,
        endDate,
        assignedTo: [byEmail[mechanicEmail]._id],
        createdBy: manager._id,
        priority: template.priority,
        status: 'completed',
      });

      counter++;
    }
  }

  currentDate.setDate(currentDate.getDate() + 1);
}

await ServiceJob.create(jobs);

console.log(`[seed] ${jobs.length} service jobs created`);

  const attendanceDate = new Date('2026-05-05T00:00:00');
  const at = (h, m) => setTime(attendanceDate, h, m);

await Attendance.create([
  // Sales
  {
    employee: byEmail['charmaine@andoys.ph']._id,
    workDate: toDateKey(attendanceDate),
    clockIn: at(8, 0),
    clockOut: at(17, 0),
    minutesWorked: 540,
    status: 'present',
  },
  {
    employee: byEmail['loida@andoys.ph']._id,
    workDate: toDateKey(attendanceDate),
    clockIn: at(8, 6),
    clockOut: at(17, 2),
    minutesWorked: 536,
    status: 'present',
  },
  {
    employee: byEmail['dannilyn@andoys.ph']._id,
    workDate: toDateKey(attendanceDate),
    clockIn: at(8, 12),
    clockOut: at(17, 1),
    minutesWorked: 529,
    status: 'present',
  },

  // Marketing
  {
    employee: byEmail['charlesdavid@andoys.ph']._id,
    workDate: toDateKey(attendanceDate),
    clockIn: at(8, 3),
    clockOut: at(17, 6),
    minutesWorked: 543,
    status: 'present',
  },
  {
    employee: byEmail['ferdiand@andoys.ph']._id,
    workDate: toDateKey(attendanceDate),
    clockIn: at(8, 18),
    clockOut: at(17, 4),
    minutesWorked: 526,
    status: 'present',
  },

  // Mechanics
  {
    employee: byEmail['jethro@andoys.ph']._id,
    workDate: toDateKey(attendanceDate),
    clockIn: at(8, 5),
    clockOut: at(17, 10),
    minutesWorked: 545,
    status: 'present',
  },
  {
    employee: byEmail['donifer@andoys.ph']._id,
    workDate: toDateKey(attendanceDate),
    clockIn: at(8, 15),
    clockOut: at(17, 0),
    minutesWorked: 525,
    status: 'present',
  },
  {
    employee: byEmail['joven@andoys.ph']._id,
    workDate: toDateKey(attendanceDate),
    clockIn: at(8, 25),
    clockOut: at(17, 20),
    minutesWorked: 535,
    status: 'late',
  },

  // Accounting
  {
    employee: byEmail['rockjohn@andoys.ph']._id,
    workDate: toDateKey(attendanceDate),
    clockIn: at(8, 10),
    clockOut: at(17, 0),
    minutesWorked: 530,
    status: 'present',
  },
]);

  await ActivityLog.create([
    {
      employee: byEmail['jethro@andoys.ph']._id,
      type: 'clock-in',
      message: 'Logged in for the first service day of January 2026.',
      loggedAt: at(8, 5),
    },
    {
      employee: byEmail['jethro@andoys.ph']._id,
      type: 'work',
      message: 'Completed clutch inspection and wheel alignment.',
      work: 'Clutch inspection and wheel alignment',
      clientName: 'Ramon Villareal',
      loggedAt: at(11, 30),
    },
    {
      employee: byEmail['donifer@andoys.ph']._id,
      type: 'work',
      message: 'Finished brake adjustment and tire pressure check.',
      work: 'Brake adjustment and tire pressure check',
      clientName: 'Liza Gamboa',
      loggedAt: at(13, 15),
    },
    {
      employee: byEmail['joven@andoys.ph']._id,
      type: 'clock-out',
      message: 'Signed out after the day’s scheduled repair jobs.',
      loggedAt: at(17, 20),
    },
    {
      employee: byEmail['charmaine@andoys.ph']._id,
      type: 'clock-in',
      message: 'Opened the counter and processed early sales transactions.',
      loggedAt: at(8, 0),
    },
    {
      employee: byEmail['rockjohn@andoys.ph']._id,
      type: 'work',
      message: 'Prepared the accounting summary for the first week.',
      work: 'Prepared accounting summary',
      clientName: 'Internal',
      loggedAt: at(15, 45),
    },
  ]);

  console.log('[seed] attendance and activity logs created');

  const availability = [];
  const availabilityStart = new Date('2026-05-02T00:00:00');
  const availabilityEnd = new Date('2026-08-30T00:00:00');

  for (const email of mechanicEmails) {
    let cursor = new Date(availabilityStart);
    while (cursor <= availabilityEnd) {
      if (!isSunday(cursor)) {
        availability.push({
          employee: byEmail[email]._id,
          workDate: toDateKey(cursor),
          isAvailable: true,
        });
      }
      cursor = dayOffset(cursor, 1);
    }
  }

  await Availability.insertMany(availability);
  console.log(`[seed] ${availability.length} availability slots created`);

  const leaveDate = toDateKey(new Date('2026-02-12T00:00:00'));
  await ShiftRequest.create({
    requestedBy: byEmail['donifer@andoys.ph']._id,
    type: 'leave',
    workDate: leaveDate,
    reason: 'Family obligation in Iloilo; will return the following day.',
  });

  await Notification.create({
    recipient: manager._id,
    title: 'Leave request waiting',
    message: `Donifer requested leave on ${leaveDate}`,
    type: 'request',
  });

  console.log('\n[seed] done. Log in with:');
  console.log('  manager@andoys.ph      / andoys123   (manager)');
  console.log('  jethro@andoys.ph     / andoys123   (mechanic)');
  console.log('  donifer@andoys.ph    / andoys123   (mechanic)');
  console.log('  joven@andoys.ph      / andoys123   (mechanic)\n');

  await disconnectDB();
}

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});