/**
 * MODEL: ServiceJob
 * ---------------------------------------------------------------
 * A scheduled piece of work: "Motorcycle Repair, July 3-5, inspect and
 * replace the damaged clutch cable." Assigned by the manager to an
 * employee, or picked up from the unassigned pool.
 *
 * This is the record the Calendar, Schedule and Home pages all read from.
 */
import mongoose from 'mongoose';

export const SERVICE_TYPES = [
  'motorcycle-repair',
  'bike-repair',
  'oil-change',
  'engine-tuneup',
  'overhaul',
  'wheel-alignment',
  'supplier-delivery',
  'other',
];

export const JOB_STATUS = ['scheduled', 'in-progress', 'for-approval', 'completed', 'cancelled'];
export const JOB_PRIORITY = ['low', 'normal', 'high'];

const serviceJobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    serviceType: {
      type: String,
      enum: SERVICE_TYPES,
      default: 'other',
    },
    clientName: {
      type: String,
      trim: true,
      default: '',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator(value) {
          return !this.startDate || value >= this.startDate;
        },
        message: 'End date cannot be before the start date',
      },
    },
      assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: JOB_STATUS,
      default: 'scheduled',
    },
    priority: {
      type: String,
      enum: JOB_PRIORITY,
      default: 'normal',
    },
    completedAt: Date,
    additionalNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    submittedAt: Date,
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

serviceJobSchema.index({ startDate: 1, endDate: 1 });
serviceJobSchema.index({ status: 1, startDate: 1 });

serviceJobSchema.virtual('durationDays').get(function durationDays() {
  if (!this.startDate || !this.endDate) return 0;
  const ms = this.endDate.getTime() - this.startDate.getTime();
  return Math.floor(ms / 86400000) + 1;
});

export default mongoose.model('ServiceJob', serviceJobSchema);
