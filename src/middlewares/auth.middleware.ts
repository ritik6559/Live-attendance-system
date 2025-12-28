import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const auth = (req: Request, res: Response, next: NextFunction) => {

    const token = req.headers.authorization;

    if (!token){
        res.status(401).json({ 
            success: false, error: "Unauthorized, token missing or invalid" 
        });
        return;
    }

    try {

        req.user = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, role: string };
        
        next();
    } catch {
        res.status(401).json({ 
            success: false, 
            error: "Unauthorized, token missing or invalid" 
        });
    }
};

export const teacherOnly = (req: Request, res: Response, next: NextFunction) => {

    if (req.user?.role !== "teacher") { 
    
        res.status(403).json({ 
            success: false, 
            error: "Forbidden, teacher access required" 
        });
    
        return;
    }
    next();
};
