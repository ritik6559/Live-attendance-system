import type { Request, Response, NextFunction, request } from "express";
import bcrypt from "bcryptjs";

import { LoginSchema, SignupSchema } from "../validators/auth.schema";
import { User } from "../models/user.model";
import { createToken } from "../utils";

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: string
            }
        }
    }
}

export const signUp = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const isValidSchema = SignupSchema.safeParse(req.body);

        if (!isValidSchema.success) {
            res.status(400).json({
                success: false,
                error: "Invalid request schema"
            });
            return;
        }

        const { email, name, password, role } = isValidSchema.data;

        const exists = await User.findOne({ email: email });

        if (exists) {
            res.status(400).json({
                success: false,
                error: "Email already exists"
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role
        });

        res.status(201).json({
            success: true,
            data: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: false,
            error: "Something went wrong."
        });
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const isValidSchema = LoginSchema.safeParse(req.body);

        if (!isValidSchema.success) {
            res.status(400).json({
                success: false,
                error: "Invalid request schema"
            });
            return;
        }

        const { email, password } = isValidSchema.data;

        const exists = await User.findOne({ email: email });

        if (!exists) {
            res.status(400).json({
                success: false,
                error: "Invalid email or password"
            });
            return;
        }

        const isPasswordCorrect = await bcrypt.compare(password, exists.password);

        if (!isPasswordCorrect) {
            res.status(400).json({
                success: false,
                error: "Invalid email or password"
            });
            return;
        }

        const token = createToken(exists._id.toString(), exists.role);

        res.status(200).json({
            success: true,
            data: {
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            error: "Something went wrong."
        });
    }
};

export const me = async (req: Request, res: Response) => {
    try{
        const user = await User.findById(req.user?.userId).select("-password");
        
        res.status(200).json({ 
            success: true, 
            data: user 
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            error: "Internal server error"
        });
    }
};