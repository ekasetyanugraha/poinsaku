import { getServiceClient } from '~/server/utils/supabase'
import { wishlistSubmissionSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = wishlistSubmissionSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Input tidak valid', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  const { error } = await db
    .from('wishlist_submissions')
    .insert(parsed.data)

  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal menyimpan data. Coba lagi.' })
  }

  return { success: true }
})
