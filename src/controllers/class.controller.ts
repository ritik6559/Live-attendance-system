import type { Request, Response, NextFunction } from "express";

import { AddStudentSchema, CreateClassSchema } from "../validators/class.schema";
import { Class } from "../models/class.mode";
import { User } from "../models/user.model";

export const createClass = async (req: Request, res: Response) => {
    try {

        const isValidSchema = CreateClassSchema.safeParse(req.body);

        if (!isValidSchema.success) {
            res.status(400).json({
                success: false,
                error: "Invalid request schema"
            });
            return;
        }

        const { className } = isValidSchema.data;

        const newClass = await Class.create({
            className,
            teacherId: req.user?.userId,
            studentIds: []
        });

        res.status(201).json({
            success: true,
            data: {
                _id: newClass._id,
                className: newClass.className,
                teacherId: newClass.teacherId,
                studentIds: []
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Something went wrong."
        });
    }
};

export const addStudent = async (req: Request, res: Response) => {
    try {
        const isValidSchema = AddStudentSchema.safeParse(req.body);

        if (!isValidSchema.success) {
            res.status(400).json({
                success: false,
                error: "Invalid request schema"
            });
            return;
        }

        const cls = await Class.findById(req.params.id);

        if (!cls) {
            res.status(404).json({
                success: false,
                error: "Class not found"
            });
            return;
        }

        if (cls.teacherId.toString() !== req.user?.userId) {
            res.status(403).json({
                success: false,
                error: "Forbidden, not class teacher"
            });
            return;
        }

        cls.studentIds.push(req.body.studentId);

        await cls.save();

        res.json({
            success: true,
            data: cls
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            error: "Something went wrong."
        });
    }
};

export const getClass = async (req: Request, res: Response) => {
    try {
        const classId = req.params.id;
        const userId = req.user?.userId;
        const role = req.user?.role;

        const cls = await Class.findById(classId)
            .populate("studentIds", "_id name email");

        if (!cls) {
            return res.status(404).json({
                success: false,
                error: "Class not found"
            });
        }

        if (role === "teacher") {

            if (cls.teacherId.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    error: "Forbidden, not class teacher"
                });
            }
        }

        if (role === "student") {

            const isEnrolled = cls.studentIds.some(
                (student: any) => student._id.toString() === userId
            );

            if (!isEnrolled) {
                return res.status(403).json({
                    success: false,
                    error: "Forbidden, student not enrolled in class"
                });
            }
        }

        res.json({
            success: true,
            data: {
                _id: cls._id,
                className: cls.className,
                teacherId: cls.teacherId,
                students: cls.studentIds
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Something went wrong."
        });
    }
};

export const getStudents = async (req: Request, res: Response) => {
    try {

        const students = await User.find({ role: "student" }).select("_id name email");
        
        res.status(200).json({ 
            success: true, 
            data: students 
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Something went wrong."
        });
    }
};