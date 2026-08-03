/**
 * MODEL: ActivityLog
 * ---------------------------------------------------------------
 * The append-only feed shown under "Today's Logs" on the manager's
 * Home and Dashboard pages:
 *
 *   John dela Cruz   09:31   Logged in on-duty
 *   Mark Perez       11:45   WORK: Repaired wheels / CLIENT: Horse
 *   Alex Reyes       16:45   Signed out
 *
 * Nothing here is ever edited or deleted - it is the audit trail that
 * replaces the shop's handwritten notebook.
 */
import mongoose from 'mongoose';

export const LOG_TYPES = ['clock-in', 'clock-out', 'work', 'schedule', 'account'];

const activityLogSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: LOG_TYPES,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    work: { type: String, trim: true, default: '' },
    clientName: { type: String, trim: true, default: '' },
    relatedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceJob',
      default: null,
    },
    loggedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ loggedAt: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
