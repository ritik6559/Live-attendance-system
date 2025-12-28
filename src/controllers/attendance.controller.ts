import type { Request, Response, NextFunction } from "express";
import { Attendance } from "../models/attendance.mode";
import { User } from "../models/user.model";
import { Class } from "../models/class.mode";

export let activeSession: any = null;

export const startSession = (classId: string) => {
    activeSession = {
        classId,
        startedAt: new Date().toISOString(),
        attendance: {}
    };
};

export const clearSession = () => {
    activeSession = null;
};

export const startAttendance = async (req: Request, res: Response) => {
    try {
        const { classId } = req.body;
        const userId = req.user?.userId;

        const cls = await Class.findById(classId);

        if ( !cls ) {
            res.status(404).json({
                success: false,
                error: "Class not found"
            });

            return;
        }

        if ( cls.teacherId.toString() !== userId ) {
            res.status(403).json({
                success: false,
                error: "Forbidden, not class teacher"
            });
            return;
        }

        startSession(classId);

        res.json({
            success: true,
            data: {
                classId,
                startedAt: new Date().toISOString()
            }
        });
    } catch {
        res.status(500).json({
            success: false,
            error: "Something went wrong."
        });
    }
};


export const getMyAttendance = async (req: Request, res: Response) => {
    try {
        const classId = req.params.id;
        const userId = req.user?.userId;
        const role = req.user?.role;

        if (role !== "student") {

            res.status(403).json({
                success: false,
                error: "Forbidden, student access required"
            });

            return;
        }

        const cls = await Class.findById(classId);

        if (!cls) {
            res.status(404).json({
                success: false,
                error: "Class not found"
            });
            return;
        }

        const isEnrolled = cls.studentIds.some(
            (id) => id.toString() === userId
        );

        if (!isEnrolled) {

            res.status(403).json({
                success: false,
                error: "Forbidden, student not enrolled in class"
            });
            return;
        }

        const attendance = await Attendance.findOne({
            classId,
            studentId: userId
        });

        res.json({
            success: true,
            data: {
                classId,
                status: attendance ? attendance.status : null
            }
        });
    } catch {
        res.status(500).json({
            success: false,
            error: "Something went wrong."
        });
    }
};
