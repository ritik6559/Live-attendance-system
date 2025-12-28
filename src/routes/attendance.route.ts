import express from "express";
import { auth, teacherOnly } from "../middlewares/auth.middleware";
import { startAttendance, getMyAttendance } from "../controllers/attendance.controller";

const router = express.Router();

router.post("/start", auth, teacherOnly, startAttendance);
router.get("/class/:id/my-attendance", auth, getMyAttendance);

export default router;
