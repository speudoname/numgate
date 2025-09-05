import { z } from 'zod'

// Password requirements
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Email validation
const emailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()
  .trim()

// Tenant name validation
const tenantNameSchema = z.string()
  .min(3, 'Tenant name must be at least 3 characters')
  .max(50, 'Tenant name is too long')
  .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Tenant name contains invalid characters')
  .trim()

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// Registration schema
export const registerSchema = z.object({
  tenantName: tenantNameSchema,
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional()
})

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema
})

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema
})

// Validate and sanitize input
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, errors }
    }
    return { success: false, errors: ['Invalid input'] }
  }
}