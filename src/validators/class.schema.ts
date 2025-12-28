import { z } from "zod";

export const CreateClassSchema = z.object({
  className: z.string().min(1)
});

export const AddStudentSchema = z.object({
  studentId: z.string()
});
