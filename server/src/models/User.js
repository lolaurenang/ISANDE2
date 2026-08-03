/**
 * MODEL: User
 * ---------------------------------------------------------------
 * One document per person who can log into the system.
 * Covers all three roles described in the documentation:
 *   manager  - system administrator (Persona 1: Von)
 *   mechanic - flexible schedule, submits availability (Persona 2: Jethro)
 *   staff    - regular schedule (cashier, sales associate, driver, accounting)
 *
 * The model owns everything about "what a user IS" and the rules that
 * must always hold true (unique email, hashed password, valid role).
 * It never knows about HTTP - that is the controller's job.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['manager', 'mechanic', 'staff'];
export const DEPARTMENTS = ['Management', 'Mechanic', 'Sales', 'Marketing', 'Accounting', 'Others'];
export const USER_STATUS = ['available', 'on-duty', 'absent', 'off-duty'];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned by default queries
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: { values: ROLES, message: '{VALUE} is not a valid role' },
      default: 'mechanic',
    },
    jobTitle: {
      type: String,
      trim: true,
      default: 'Mechanic',
    },
    department: {
      type: String,
      enum: DEPARTMENTS,
      default: 'Mechanic',
    },
    status: {
      type: String,
      enum: USER_STATUS,
      default: 'available',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    // Target work hours per week - used by the reporting dashboard
    weeklyHourTarget: {
      type: Number,
      default: 40,
      min: 0,
      max: 168,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/* ----------------------------- Indexes ----------------------------- */
userSchema.index({ role: 1, isActive: 1 });

/* --------------------------- Middleware ---------------------------- */
// Hash the password whenever it is set or changed. Because this lives on
// the model, no controller can ever accidentally store a plain password.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* ----------------------------- Methods ----------------------------- */
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual('isManager').get(function isManager() {
  return this.role === 'manager';
});

export default mongoose.model('User', userSchema);
