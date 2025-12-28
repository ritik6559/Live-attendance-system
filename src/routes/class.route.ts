import express from "express";

import { auth, teacherOnly } from "../middlewares/auth.middleware";
import { createClass, addStudent, getClass, getStudents } from "../controllers/class.controller.ts";

const router = express.Router();

router.post("/", auth, teacherOnly, createClass);
router.post("/:id/add-student", auth, teacherOnly, addStudent);
router.get("/:id", auth, getClass);
router.get("/", auth, teacherOnly, getStudents);

export default router;