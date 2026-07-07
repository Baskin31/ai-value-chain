import { readFileSync } from 'fs'
import { join } from 'path'
import { load as yamlLoad } from 'js-yaml'
import fg from 'fast-glob'
const { glob } = fg
import { differenceInDays, parseISO } from 'date-fns'
import { LayersFileSchema } from '../src/schema/layer'
import { ModelConfigSchema } from '../src/schema/modelConfig'
import { CompanySchema } from '../src/schema/company'

const MARKET_CAP_STALENESS_DAYS = 21
const MODEL_STALENESS_DAYS = 90

let errors = 0
let warnings = 0

function error(file: string, msg: string) {
  console.error(`\x1b[31mERROR\x1b[0m [${file}]: ${msg}`)
  errors++
}

function warn(file: string, msg: string) {
  console.warn(`\x1b[33mWARN\x1b[0m  [${file}]: ${msg}`)
  warnings++
}

function loadYaml(filePath: string): unknown {
  return yamlLoad(readFileSync(filePath, 'utf8'))
}

// Resolve path relative to ai-value-chain/ directory
const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

// ── 1. Validate layers.yaml ────────────────────────────────────────────────
const layersPath = join(ROOT, 'data/layers.yaml')
let knownLayerIds: Set<string> = new Set()

try {
  const layersRaw = loadYaml(layersPath)
  const result = LayersFileSchema.safeParse(layersRaw)
  if (!result.success) {
    result.error.issues.forEach(i => error('data/layers.yaml', i.message))
  } else {
    knownLayerIds = new Set(result.data.layers.map(l => l.id))
    console.log(`✓ data/layers.yaml — ${result.data.layers.length} layers`)
  }
} catch (e) {
  const msg = (e as NodeJS.ErrnoException).code === 'ENOENT'
    ? 'File not found — expected during early phases'
    : `Failed to load: ${(e as Error).message}`
  const isEnoent = (e as NodeJS.ErrnoException).code === 'ENOENT'
  if (isEnoent) warn('data/layers.yaml', msg)
  else error('data/layers.yaml', msg)
}

// ── 2. Validate model-config.yaml ─────────────────────────────────────────
const configPath = join(ROOT, 'data/model-config.yaml')

try {
  const configRaw = loadYaml(configPath)
  const result = ModelConfigSchema.safeParse(configRaw)
  if (!result.success) {
    result.error.issues.forEach(i => error('data/model-config.yaml', i.message))
  } else {
    console.log('✓ data/model-config.yaml')
  }
} catch (e) {
  const isEnoent = (e as NodeJS.ErrnoException).code === 'ENOENT'
  if (isEnoent) warn('data/model-config.yaml', 'File not found — expected during early phases')
  else error('data/model-config.yaml', `Failed to load: ${(e as Error).message}`)
}

// ── 3. Validate all company files ─────────────────────────────────────────
const companyFiles = await glob('data/companies/*.yaml', { cwd: ROOT, absolute: true })
const knownCompanyIds: Set<string> = new Set()
const companies: Array<{ id: string; file: string; data: ReturnType<typeof CompanySchema.parse> }> = []

if (companyFiles.length === 0) {
  warn('data/companies/', 'No company files found — expected during early phases')
}

for (const filePath of companyFiles.sort()) {
  const relPath = `data/companies/${filePath.split('/').pop()}`
  try {
    const raw = loadYaml(filePath)
    const result = CompanySchema.safeParse(raw)
    if (!result.success) {
      result.error.issues.forEach(i =>
        error(relPath, `${i.path.join('.')}: ${i.message}`)
      )
    } else {
      const company = result.data
      knownCompanyIds.add(company.id)
      companies.push({ id: company.id, file: relPath, data: company })

      // Cross-check: layer must be in knownLayerIds
      if (knownLayerIds.size > 0 && !knownLayerIds.has(company.layer)) {
        error(relPath, `layer "${company.layer}" not found in layers.yaml`)
      }
      if (company.secondary_layers) {
        for (const sl of company.secondary_layers) {
          if (knownLayerIds.size > 0 && !knownLayerIds.has(sl)) {
            error(relPath, `secondary_layer "${sl}" not found in layers.yaml`)
          }
        }
      }

      // Staleness warnings
      const marketCapAge = differenceInDays(new Date(), parseISO(company.fundamentals.market_cap_date))
      if (marketCapAge > MARKET_CAP_STALENESS_DAYS) {
        warn(relPath, `market_cap_date is ${marketCapAge} days old (threshold: ${MARKET_CAP_STALENESS_DAYS})`)
      }

      if (company.model) {
        const modelAge = differenceInDays(new Date(), parseISO(company.model.model_updated))
        if (modelAge > MODEL_STALENESS_DAYS) {
          warn(relPath, `model_updated is ${modelAge} days old (threshold: ${MODEL_STALENESS_DAYS})`)
        }
      }

      if (company.strategic_dynamics.length === 0 && !company.is_exposure_vehicle) {
        warn(relPath, 'strategic_dynamics is empty')
      }
    }
  } catch (e) {
    error(relPath, `Failed to load: ${(e as Error).message}`)
  }
}

// ── 4. Cross-check relationships ──────────────────────────────────────────
for (const { file, data } of companies) {
  if (data.relationships) {
    for (const rel of data.relationships) {
      if (!knownCompanyIds.has(rel.company_id)) {
        error(file, `relationships[].company_id "${rel.company_id}" not found in data/companies/`)
      }
    }
  }
}

// ── 5. Summary ────────────────────────────────────────────────────────────
console.log(`\n── Summary ────────────────────────────────`)
console.log(`Companies validated: ${companies.length}`)
console.log(`Errors:   ${errors}`)
console.log(`Warnings: ${warnings}`)

if (errors > 0) {
  console.error(`\n\x1b[31m✗ Validation failed with ${errors} error(s)\x1b[0m`)
  process.exit(1)
} else {
  console.log(`\n\x1b[32m✓ Validation passed\x1b[0m${warnings > 0 ? ` (${warnings} warning(s))` : ''}`)
}
