/**
 * MODEL: ShiftRequest
 * ---------------------------------------------------------------
 * An employee asks for a day off or a shift swap; the manager approves
 * or denies it. Replaces "changes in work hours are communicated
 * verbally, which often results in missed messages".
 */
import mongoose from 'mongoose';

export const REQUEST_TYPES = ['time-off', 'shift-change', 'schedule-swap'];
export const REQUEST_STATUS = ['pending', 'approved', 'denied'];

const shiftRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, enum: REQUEST_TYPES, default: 'time-off' },
    workDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'workDate must be YYYY-MM-DD'],
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: REQUEST_STATUS, default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: Date,
    reviewNote: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('ShiftRequest', shiftRequestSchema);
