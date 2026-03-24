import { z } from 'zod'

export const businessSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
})

export const branchSchema = z.object({
  business_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})

export const memberSchema = z.object({
  auth_user_id: z.string().uuid(),
  role: z.enum(['superadmin', 'owner', 'admin', 'cashier']),
  scope_type: z.enum(['business', 'branch']),
  scope_id: z.string().uuid(),
  is_active: z.boolean().default(true),
  display_name: z.string().max(100).nullable().optional(),
})

export const programBaseSchema = z.object({
  business_id: z.string().uuid(),
  type: z.enum(['stamp', 'membership']),
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  scope_type: z.enum(['business', 'branch']),
  scope_id: z.string().uuid(),
  color_primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  color_secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
})

export const stampConfigSchema = z.object({
  stamp_target: z.number().int().min(1).max(30),
  stamp_mode: z.enum(['per_transaction', 'amount_based']),
  amount_per_stamp: z.number().positive().optional(),
  stamps_per_transaction: z.number().int().positive().default(1),
  reward_description: z.string().optional(),
})

export const membershipConfigSchema = z.object({
  cashback_redemption_mode: z.enum(['transaction_deduction', 'voucher']),
})

export const tierSchema = z.object({
  name: z.string().min(1).max(50),
  rank: z.number().int().positive(),
  cashback_percentage: z.number().min(0).max(100),
  auto_upgrade_rule_type: z.enum(['total_spend', 'transaction_count', 'manual_only']),
  auto_upgrade_threshold: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const voucherOptionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  cashback_cost: z.number().positive(),
  expiry_days: z.number().int().positive(),
  image_url: z.string().url().optional(),
})

export const customerRegisterSchema = z.object({
  phone: z.string().regex(/^(?:\+62|62|0)[2-9]\d{7,11}$/),
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  program_id: z.string().uuid(),
})

export const phoneSchema = z.string().regex(/^(?:\+62|62|0)[2-9]\d{7,11}$/)

export const customerLookupSchema = z.object({
  phone: phoneSchema,
})

// Transaction request schemas
export const stampAddSchema = z.object({
  customer_program_id: z.string(),
  branch_id: z.string().nullable().optional(),
  transaction_amount: z.number().positive().optional(),
  stamps_count: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

export const stampRedeemSchema = z.object({
  customer_program_id: z.string(),
  branch_id: z.string().nullable().optional(),
  notes: z.string().optional(),
})

export const cashbackEarnSchema = z.object({
  customer_program_id: z.string().uuid(),
  branch_id: z.string().uuid().nullable().optional(),
  transaction_amount: z.number().positive(),
  notes: z.string().optional(),
})

export const cashbackRedeemSchema = z.object({
  customer_program_id: z.string().uuid(),
  branch_id: z.string().uuid().nullable().optional(),
  amount: z.number().positive(),
  notes: z.string().optional(),
})

export const tierUpgradeSchema = z.object({
  customer_program_id: z.string().uuid(),
  target_tier_id: z.string().uuid(),
  notes: z.string().optional(),
})

export const voucherGenerateSchema = z.object({
  customer_program_id: z.string().uuid(),
  voucher_option_id: z.string().uuid(),
  qr_token: z.string().min(1),
})

// --- Staff Management Schemas (Phase 2) ---

export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    'Password must be at least 8 characters with uppercase, lowercase, and number',
  ),
  display_name: z.string().max(100).optional(),
  role: z.enum(['admin', 'cashier']),
  scope_type: z.enum(['business', 'branch']),
  scope_id: z.string().uuid(),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    'Password must be at least 8 characters with uppercase, lowercase, and number',
  ),
})

export const updateStatusSchema = z.object({
  action: z.enum(['deactivate', 'reactivate']),
})

export const reassignBranchSchema = z.object({
  scope_type: z.enum(['business', 'branch']),
  scope_id: z.string().uuid(),
})

// Phone normalization
// --- Wishlist Schema ---
export const wishlistSubmissionSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  email: z.string().email('Email tidak valid'),
  company: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  message: z.string().max(250).optional(),
})

export function normalizePhone(phone: string): string {
  if (phone.startsWith('+62')) return phone
  if (phone.startsWith('62')) return '+' + phone
  if (phone.startsWith('0')) return '+62' + phone.slice(1)
  return phone
}

export function calculateStampsFromAmount(amount: number, amountPerStamp: number): number {
  if (!amountPerStamp || amountPerStamp <= 0) return 0
  if (amount <= 0) return 0
  return Math.floor(amount / amountPerStamp)
}
