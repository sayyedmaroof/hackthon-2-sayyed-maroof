export interface ShippingAddress {
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  country: string
}

export type ShippingAddressResult =
  | { ok: true; value: ShippingAddress }
  | { ok: false; error: string }

export function parseShippingAddress(value: unknown): ShippingAddressResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'Please enter a valid shipping address.' }
  }

  const input = value as Record<string, unknown>
  const fields = {
    line1: { label: 'street address', max: 120, required: true },
    line2: { label: 'apartment or unit', max: 120, required: false },
    city: { label: 'city', max: 80, required: true },
    state: { label: 'state or region', max: 80, required: true },
    postalCode: { label: 'postal code', max: 24, required: true },
    country: { label: 'country', max: 80, required: true },
  } as const

  const address = {} as ShippingAddress
  for (const [key, field] of Object.entries(fields)) {
    const raw = input[key]
    if (typeof raw !== 'string') {
      if (raw === undefined && !field.required) {
        address[key as keyof ShippingAddress] = ''
        continue
      }
      return { ok: false, error: `Please enter a valid ${field.label}.` }
    }

    const trimmed = raw.trim()
    if (field.required && !trimmed) {
      return { ok: false, error: `Please enter your ${field.label}.` }
    }
    if (trimmed.length > field.max) {
      return { ok: false, error: `Your ${field.label} is too long.` }
    }
    address[key as keyof ShippingAddress] = trimmed
  }

  return { ok: true, value: address }
}
