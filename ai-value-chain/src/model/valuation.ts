export function computeEffectiveMultiple(
  upsideMultiple: number,
  currentMarketCapB: number,
  maxPlausibleMarketCapB: number
): number {
  const cap = maxPlausibleMarketCapB / currentMarketCapB
  return Math.min(upsideMultiple, cap)
}
