import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = "C:/Users/RnBas/ClaudeProjects/ai-value-chain/data/companies";

// [filename, bareUrlToFix_or_null, newSourceBlock]
const additions = [
  ["mp_materials.yaml", null, '    - description: "MP Materials investor relations and SEC filings"\n      url: "https://finance.yahoo.com/quote/MP"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["albemarle.yaml", null, '    - description: "Albemarle Corporation Yahoo Finance"\n      url: "https://finance.yahoo.com/quote/ALB"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["lynas.yaml", null, '    - description: "Lynas Rare Earths investor relations (ASX: LYC)"\n      url: "https://www.lynasrareearths.com/investors/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["perpetua_resources.yaml", null, '    - description: "Perpetua Resources investor relations"\n      url: "https://finance.yahoo.com/quote/PPTA"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["energy_fuels.yaml", null, '    - description: "Energy Fuels investor relations"\n      url: "https://finance.yahoo.com/quote/UUUU"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["vital_metals.yaml", null, '    - description: "Vital Metals ASX announcements"\n      url: "https://www.vitalmetals.com.au/investors/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["china_rare_earth.yaml", null, '    - description: "China Rare Earth Holdings HKEX filings"\n      url: "https://www.hkex.com.hk/Market-Data/Securities-Prices/Equities?sc_lang=en"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["china_northern_rare_earth.yaml", null, '    - description: "China Northern Rare Earth SSE investor relations"\n      url: "https://finance.yahoo.com/quote/CHERY/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["remx.yaml", null, '    - description: "VanEck Rare Earth ETF fund page"\n      url: "https://www.vaneck.com/us/en/investments/rare-earth-strategic-metals-etf-remx/"\n      accessed: "2026-07-07"\n      is_sourced_fact: true'],
  ["asml.yaml", null, '    - description: "ASML investor relations — annual reports and quarterly earnings"\n      url: "https://www.asml.com/en/investors"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["applied_materials.yaml", null, '    - description: "Applied Materials Yahoo Finance"\n      url: "https://finance.yahoo.com/quote/AMAT"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["lam_research.yaml", null, '    - description: "Lam Research investor relations"\n      url: "https://finance.yahoo.com/quote/LRCX"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["onto_innovation.yaml", null, '    - description: "Onto Innovation investor relations"\n      url: "https://finance.yahoo.com/quote/ONTO"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["axcelis_technologies.yaml", null, '    - description: "Axcelis Technologies Yahoo Finance"\n      url: "https://finance.yahoo.com/quote/ACLS"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["lasertec.yaml", null, '    - description: "Lasertec Corp TSE investor page"\n      url: "https://www.lasertec.co.jp/eng/ir/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["tsmc.yaml", null, '    - description: "TSMC Yahoo Finance ADR quote"\n      url: "https://finance.yahoo.com/quote/TSM"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["samsung_electronics.yaml", null, '    - description: "Samsung Electronics global investor relations"\n      url: "https://www.samsung.com/global/ir/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["intel.yaml", null, '    - description: "Intel Corporation investor relations"\n      url: "https://finance.yahoo.com/quote/INTC"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["ase_technology.yaml", null, '    - description: "ASE Technology Holding investor relations"\n      url: "https://finance.yahoo.com/quote/ASX"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["amkor.yaml", null, '    - description: "Amkor Technology investor relations"\n      url: "https://finance.yahoo.com/quote/AMKR"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["jcet.yaml", null, '    - description: "JCET Group SSE filings and IR"\n      url: "https://www.jcetglobal.com/en/investor-relations/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["micron.yaml", null, '    - description: "Micron Technology investor relations"\n      url: "https://finance.yahoo.com/quote/MU"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["sk_hynix.yaml", null, '    - description: "SK Hynix investor relations (KRX: 000660)"\n      url: "https://www.skhynix.com/ir/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["nanya_technology.yaml", null, '    - description: "Nanya Technology TWSE investor page"\n      url: "https://www.nanya.com/en/Investor"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["cxmt.yaml", null, '    - description: "CXMT (ChangXin Memory) corporate website"\n      url: "https://www.cxmt.com/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["nvidia.yaml", "investor.nvidia.com", '    - description: "NVIDIA Yahoo Finance stock data"\n      url: "https://finance.yahoo.com/quote/NVDA"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["amd.yaml", "ir.amd.com", '    - description: "AMD investor relations"\n      url: "https://finance.yahoo.com/quote/AMD"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["broadcom.yaml", "investors.broadcom.com", '    - description: "Broadcom investor relations"\n      url: "https://finance.yahoo.com/quote/AVGO"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["cerebras_systems.yaml", "cerebras.net", '    - description: "Cerebras Systems corporate website and funding announcements"\n      url: "https://cerebras.ai/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["tenstorrent.yaml", "tenstorrent.com", '    - description: "Tenstorrent corporate website"\n      url: "https://tenstorrent.com/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["groq.yaml", "groq.com", '    - description: "Groq corporate website and GroqCloud"\n      url: "https://groq.com/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["nextera_energy.yaml", "investor.nexteraenergy.com", '    - description: "NextEra Energy investor relations"\n      url: "https://finance.yahoo.com/quote/NEE"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["constellation_energy.yaml", "investor.constellationenergy.com", '    - description: "Constellation Energy investor relations"\n      url: "https://finance.yahoo.com/quote/CEG"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["vertiv.yaml", "investors.vertiv.com", '    - description: "Vertiv Holdings investor relations"\n      url: "https://finance.yahoo.com/quote/VRT"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["nvent_electric.yaml", "investors.nvent.com", '    - description: "nVent Electric investor relations"\n      url: "https://finance.yahoo.com/quote/NVT"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["bloom_energy.yaml", "investors.bloomenergy.com", '    - description: "Bloom Energy investor relations"\n      url: "https://finance.yahoo.com/quote/BE"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["microsoft.yaml", "investor.microsoft.com", '    - description: "Microsoft investor relations"\n      url: "https://finance.yahoo.com/quote/MSFT"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["amazon.yaml", "ir.aboutamazon.com", '    - description: "Amazon investor relations"\n      url: "https://finance.yahoo.com/quote/AMZN"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["alphabet.yaml", "abc.xyz/investor", '    - description: "Alphabet investor relations"\n      url: "https://finance.yahoo.com/quote/GOOGL"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["coreweave.yaml", "investors.coreweave.com", '    - description: "CoreWeave investor relations"\n      url: "https://finance.yahoo.com/quote/CRWV"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["equinix.yaml", "investor.equinix.com", '    - description: "Equinix investor relations"\n      url: "https://finance.yahoo.com/quote/EQIX"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["digital_realty.yaml", "ir.digitalrealty.com", '    - description: "Digital Realty investor relations"\n      url: "https://finance.yahoo.com/quote/DLR"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["xai.yaml", "x.ai", '    - description: "xAI (Grok) corporate website"\n      url: "https://x.ai/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["mistral_ai.yaml", "mistral.ai", '    - description: "Mistral AI corporate website and La Plateforme docs"\n      url: "https://mistral.ai/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["salesforce.yaml", "investor.salesforce.com", '    - description: "Salesforce investor relations"\n      url: "https://finance.yahoo.com/quote/CRM"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["servicenow.yaml", "investors.servicenow.com", '    - description: "ServiceNow investor relations"\n      url: "https://finance.yahoo.com/quote/NOW"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["palantir.yaml", "investors.palantir.com", '    - description: "Palantir investor relations"\n      url: "https://finance.yahoo.com/quote/PLTR"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["harvey_ai.yaml", "harvey.ai", '    - description: "Harvey AI corporate website"\n      url: "https://www.harvey.ai/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["glean.yaml", "glean.com", '    - description: "Glean Technologies corporate website"\n      url: "https://www.glean.com/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
  ["writer.yaml", "writer.com", '    - description: "Writer Inc corporate website"\n      url: "https://writer.com/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'],
];

const errors = [];
const updated = [];

for (const [filename, bareUrl, newSource] of additions) {
  const filepath = join(BASE, filename);
  let content = readFileSync(filepath, 'utf-8');

  // Fix bare URL if needed
  if (bareUrl) {
    const old = `url: "${bareUrl}"`;
    const replacement = `url: "https://${bareUrl}"`;
    if (content.includes(old)) {
      content = content.replace(old, replacement);
    } else {
      errors.push(`WARNING: bare URL not found in ${filename}: ${bareUrl}`);
    }
  }

  // Find the sources: block and the first is_sourced_fact line
  const sourcesIdx = content.indexOf('  sources:\n');
  if (sourcesIdx === -1) {
    errors.push(`ERROR: no sources: block in ${filename}`);
    continue;
  }

  const isSourcededIdx = content.indexOf('      is_sourced_fact:', sourcesIdx);
  if (isSourcededIdx === -1) {
    errors.push(`ERROR: no is_sourced_fact in ${filename}`);
    continue;
  }

  const endOfLine = content.indexOf('\n', isSourcededIdx);
  if (endOfLine === -1) {
    errors.push(`ERROR: no newline after is_sourced_fact in ${filename}`);
    continue;
  }

  // Insert new source block after the first is_sourced_fact line
  content = content.slice(0, endOfLine + 1) + newSource + '\n' + content.slice(endOfLine + 1);

  writeFileSync(filepath, content, 'utf-8');
  updated.push(filename);
}

console.log(`Updated ${updated.length} files.`);
for (const f of updated) console.log(`  OK: ${f}`);
if (errors.length) {
  console.log('\nErrors/warnings:');
  for (const e of errors) console.log(`  ${e}`);
}
