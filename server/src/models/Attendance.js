/**
 * MODEL: Attendance
 * ---------------------------------------------------------------
 * One document per employee per working day.
 * Solves the documented problem: "clocking in is done informally,
 * which leads to inconsistencies in work hour tracking and disputes."
 *
 * `workDate` is stored as a YYYY-MM-DD string so a compound unique
 * index can guarantee one attendance record per person per day,
 * regardless of timezone drift on the client.
 */
import mongoose from 'mongoose';

export const ATTENDANCE_STATUS = ['present', 'late', 'absent', 'on-leave'];

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workDate: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'workDate must be YYYY-MM-DD'],
    },
    clockIn: Date,
    clockOut: Date,
    // Minutes worked. Written once on clock-out so reports never
    // have to recompute across thousands of documents.
    minutesWorked: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUS,
      default: 'present',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

attendanceSchema.index({ employee: 1, workDate: 1 }, { unique: true });
attendanceSchema.index({ workDate: -1 });

attendanceSchema.virtual('hoursWorked').get(function hoursWorked() {
  return Math.round((this.minutesWorked / 60) * 100) / 100;
});

attendanceSchema.virtual('isOpen').get(function isOpen() {
  return Boolean(this.clockIn) && !this.clockOut;
});

export default mongoose.model('Attendance', attendanceSchema);
