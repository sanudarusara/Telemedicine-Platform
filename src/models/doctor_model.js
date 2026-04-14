const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const VALID_WORKING_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function normalizeWorkingDays(workingDays) {
  if (!Array.isArray(workingDays) || workingDays.length === 0) {
    return ["mon", "tue", "wed", "thu", "fri"];
  }

  const cleaned = [
    ...new Set(
      workingDays
        .map((d) => String(d).trim().toLowerCase())
        .filter((d) => VALID_WORKING_DAYS.includes(d))
    ),
  ];

  return cleaned.length ? cleaned : ["mon", "tue", "wed", "thu", "fri"];
}

function normalizeHolidayDates(holidayDates) {
  if (!Array.isArray(holidayDates) || holidayDates.length === 0) {
    return [];
  }

  return [
    ...new Set(
      holidayDates
        .map((d) => String(d).trim())
        .filter(Boolean)
    ),
  ];
}

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    specialization: { type: String, required: true, trim: true },
    clinic: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    phone: { type: String, required: true, trim: true },

    role: { type: String, default: "doctor" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    isActive: { type: Boolean, default: false },

    startTime: { type: String, default: "09:00", trim: true },
    endTime: { type: String, default: "17:00", trim: true },
    sessionTime: { type: Number, default: 30, min: 1 },

    workingDays: {
      type: [String],
      default: ["mon", "tue", "wed", "thu", "fri"],
      set: normalizeWorkingDays,
    },

    holidayDates: {
      type: [String],
      default: [],
      set: normalizeHolidayDates,
    },
  },
  { timestamps: true }
);

doctorSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  console.log("Hashing password...");

  try {
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
  } catch (err) {
    console.error("Error hashing password:", err);
    throw err;
  }
});

doctorSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Doctor", doctorSchema, "doctors");