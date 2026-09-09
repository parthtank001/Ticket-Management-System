import { z } from 'zod';
import { Role } from '../enums';

/**
 * Zod validation schema for creating a new user
 */
export const createUserSchema = z.object({
  name: z
    .string({ message: 'Name must be at least 3 characters long.' })
    .trim()
    .min(3, 'Name must be at least 3 characters long.'),
  email: z
    .string({ message: 'A valid email address is required.' })
    .trim()
    .email('A valid email address is required.'),
  password: z
    .string({ message: 'Password must be at least 8 characters long.' })
    .min(8, 'Password must be at least 8 characters long.')
    .refine((val) => !/\s/.test(val), {
      message: 'Password must not contain spaces.',
    }),
  role: z.nativeEnum(Role).optional().default(Role.AGENT),
  isActive: z.boolean().optional().default(true),
});

/**
 * Zod validation schema for updating an existing user
 */
export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters long.')
    .optional(),
  role: z
    .nativeEnum(Role, {
      message: 'Invalid role specified. Must be ADMIN or AGENT.',
    })
    .optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .refine((val) => !/\s/.test(val), {
      message: 'Password must not contain spaces.',
    })
    .optional(),
});

export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreateUserOutput = z.output<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type UpdateUserOutput = z.output<typeof updateUserSchema>;
