import { z } from "zod";

export const StartAttendanceSchema = z.object({
  classId: z.string()
});
