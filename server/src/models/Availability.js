/**
 * MODEL: Availability
 * ---------------------------------------------------------------
 * Mechanics have flexible hours (Persona 2), so they declare the days
 * they can work. The manager reads this before assigning a ServiceJob,
 * which is what removes the "schedule conflicts and understaffing"
 * root cause from the Ishikawa diagram.
 */
import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema(
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
    isAvailable: {
      type: Boolean,
      default: true,
    },
    startTime: {
      type: String, // 'HH:mm' 24-hour
      default: '08:00',
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be HH:mm'],
    },
    endTime: {
      type: String,
      default: '17:00',
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'endTime must be HH:mm'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
  },
  { timestamps: true }
);

availabilitySchema.index({ employee: 1, workDate: 1 }, { unique: true });

export default mongoose.model('Availability', availabilitySchema);
