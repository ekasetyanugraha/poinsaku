import type { H3Event } from 'h3'

export function getBusinessIdFromQuery(event: H3Event): string {
  const query = getQuery(event)
  const businessId = query.business_id as string
  if (!businessId) {
    throw createError({ statusCode: 400, message: 'business_id is required' })
  }
  return businessId
}

export function getBusinessIdFromBody(body: Record<string, unknown>): string {
  const businessId = body.business_id as string
  if (!businessId) {
    throw createError({ statusCode: 400, message: 'business_id is required' })
  }
  return businessId
}
