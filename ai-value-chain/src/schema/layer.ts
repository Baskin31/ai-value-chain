import { z } from 'zod'

export const LayerSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  order: z.number().int().positive(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export const LayersFileSchema = z.object({
  layers: z.array(LayerSchema),
})

export type Layer = z.infer<typeof LayerSchema>
