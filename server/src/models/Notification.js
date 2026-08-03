/**
 * MODEL: Notification
 * ---------------------------------------------------------------
 * In-app alerts: "you have been assigned a job", "your shift request
 * was approved". Addresses the documented pain point that schedule
 * changes were passed on verbally and often never reached the mechanic.
 */
import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = ['assignment', 'schedule-change', 'request', 'reminder', 'system'];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    relatedJob: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceJob', default: null },
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
