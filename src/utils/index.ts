import jwt from "jsonwebtoken";

export const createToken = (userId: string, role: string) => {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET!);
}