import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z.string().min(1),
});
