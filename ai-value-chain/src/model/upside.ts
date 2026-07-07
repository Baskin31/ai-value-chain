export function computeEV(
  upside_probability: number,
  effective_multiple: number
): number {
  return upside_probability * (effective_multiple - 1)
}
