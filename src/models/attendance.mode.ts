import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true
    }
  },
  {
    timestamps: true
  }
);

attendanceSchema.index({ classId: 1, studentId: 1 }, { unique: true });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
