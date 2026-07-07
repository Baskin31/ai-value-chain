import layersRaw from '../../data/layers.yaml'
import modelConfigRaw from '../../data/model-config.yaml'
import { CompanySchema, LayersFileSchema, ModelConfigSchema } from '../schema/types'
import type { Company, Layer, ModelConfig } from '../schema/types'

const companyModules = import.meta.glob('../../data/companies/*.yaml', {
  eager: true,
}) as Record<string, { default: unknown }>

function loadCompanies(): Company[] {
  const companies: Company[] = []
  for (const [path, mod] of Object.entries(companyModules)) {
    const result = CompanySchema.safeParse(mod.default)
    if (result.success) {
      companies.push(result.data)
    } else {
      console.warn(`[loader] Invalid company YAML at ${path}:`, result.error.issues)
    }
  }
  return companies
}

function loadLayers(): Layer[] {
  const result = LayersFileSchema.safeParse(layersRaw)
  if (!result.success) {
    console.error('[loader] Invalid layers.yaml:', result.error.issues)
    return []
  }
  return result.data.layers
}

function loadModelConfig(): ModelConfig {
  const result = ModelConfigSchema.safeParse(modelConfigRaw)
  if (!result.success) {
    throw new Error(`[loader] Invalid model-config.yaml: ${JSON.stringify(result.error.issues)}`)
  }
  return result.data
}

export const companies: Company[] = loadCompanies()
export const layers: Layer[] = loadLayers()
export const modelConfig: ModelConfig = loadModelConfig()
