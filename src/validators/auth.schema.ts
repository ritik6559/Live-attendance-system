import { z } from "zod";

export const SignupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["teacher", "student"])
});

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string()
});
