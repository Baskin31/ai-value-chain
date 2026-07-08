import os

BASE = "/c/Users/RnBas/ClaudeProjects/ai-value-chain/data/companies"

# Map: filename -> (bare_url_to_fix_or_None, new_source_yaml_block)
additions = [
    ("mp_materials.yaml", None, '    - description: "MP Materials investor relations and SEC filings"\n      url: "https://finance.yahoo.com/quote/MP"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("albemarle.yaml", None, '    - description: "Albemarle Corporation Yahoo Finance"\n      url: "https://finance.yahoo.com/quote/ALB"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("lynas.yaml", None, '    - description: "Lynas Rare Earths investor relations (ASX: LYC)"\n      url: "https://www.lynasrareearths.com/investors/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("perpetua_resources.yaml", None, '    - description: "Perpetua Resources investor relations"\n      url: "https://finance.yahoo.com/quote/PPTA"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("energy_fuels.yaml", None, '    - description: "Energy Fuels investor relations"\n      url: "https://finance.yahoo.com/quote/UUUU"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("vital_metals.yaml", None, '    - description: "Vital Metals ASX announcements"\n      url: "https://www.vitalmetals.com.au/investors/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("china_rare_earth.yaml", None, '    - description: "China Rare Earth Holdings HKEX filings"\n      url: "https://www.hkex.com.hk/Market-Data/Securities-Prices/Equities?sc_lang=en"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("china_northern_rare_earth.yaml", None, '    - description: "China Northern Rare Earth SSE investor relations"\n      url: "https://finance.yahoo.com/quote/CHERY/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("remx.yaml", None, '    - description: "VanEck Rare Earth ETF fund page"\n      url: "https://www.vaneck.com/us/en/investments/rare-earth-strategic-metals-etf-remx/"\n      accessed: "2026-07-07"\n      is_sourced_fact: true'),
    ("asml.yaml", None, '    - description: "ASML investor relations — annual reports and quarterly earnings"\n      url: "https://www.asml.com/en/investors"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("applied_materials.yaml", None, '    - description: "Applied Materials Yahoo Finance"\n      url: "https://finance.yahoo.com/quote/AMAT"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("lam_research.yaml", None, '    - description: "Lam Research investor relations"\n      url: "https://finance.yahoo.com/quote/LRCX"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("onto_innovation.yaml", None, '    - description: "Onto Innovation investor relations"\n      url: "https://finance.yahoo.com/quote/ONTO"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("axcelis_technologies.yaml", None, '    - description: "Axcelis Technologies Yahoo Finance"\n      url: "https://finance.yahoo.com/quote/ACLS"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("lasertec.yaml", None, '    - description: "Lasertec Corp TSE investor page"\n      url: "https://www.lasertec.co.jp/eng/ir/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("tsmc.yaml", None, '    - description: "TSMC Yahoo Finance ADR quote"\n      url: "https://finance.yahoo.com/quote/TSM"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("samsung_electronics.yaml", None, '    - description: "Samsung Electronics global investor relations"\n      url: "https://www.samsung.com/global/ir/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("intel.yaml", None, '    - description: "Intel Corporation investor relations"\n      url: "https://finance.yahoo.com/quote/INTC"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("ase_technology.yaml", None, '    - description: "ASE Technology Holding investor relations"\n      url: "https://finance.yahoo.com/quote/ASX"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("amkor.yaml", None, '    - description: "Amkor Technology investor relations"\n      url: "https://finance.yahoo.com/quote/AMKR"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("jcet.yaml", None, '    - description: "JCET Group SSE filings and IR"\n      url: "https://www.jcetglobal.com/en/investor-relations/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("micron.yaml", None, '    - description: "Micron Technology investor relations"\n      url: "https://finance.yahoo.com/quote/MU"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("sk_hynix.yaml", None, '    - description: "SK Hynix investor relations (KRX: 000660)"\n      url: "https://www.skhynix.com/ir/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("nanya_technology.yaml", None, '    - description: "Nanya Technology TWSE investor page"\n      url: "https://www.nanya.com/en/Investor"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("cxmt.yaml", None, '    - description: "CXMT (ChangXin Memory) corporate website"\n      url: "https://www.cxmt.com/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("nvidia.yaml", "investor.nvidia.com", '    - description: "NVIDIA Yahoo Finance stock data"\n      url: "https://finance.yahoo.com/quote/NVDA"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("amd.yaml", "ir.amd.com", '    - description: "AMD investor relations"\n      url: "https://finance.yahoo.com/quote/AMD"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("broadcom.yaml", "investors.broadcom.com", '    - description: "Broadcom investor relations"\n      url: "https://finance.yahoo.com/quote/AVGO"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("cerebras_systems.yaml", "cerebras.net", '    - description: "Cerebras Systems corporate website and funding announcements"\n      url: "https://cerebras.ai/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("tenstorrent.yaml", "tenstorrent.com", '    - description: "Tenstorrent corporate website"\n      url: "https://tenstorrent.com/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("groq.yaml", "groq.com", '    - description: "Groq corporate website and GroqCloud"\n      url: "https://groq.com/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("nextera_energy.yaml", "investor.nexteraenergy.com", '    - description: "NextEra Energy investor relations"\n      url: "https://finance.yahoo.com/quote/NEE"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("constellation_energy.yaml", "investor.constellationenergy.com", '    - description: "Constellation Energy investor relations"\n      url: "https://finance.yahoo.com/quote/CEG"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("vertiv.yaml", "investors.vertiv.com", '    - description: "Vertiv Holdings investor relations"\n      url: "https://finance.yahoo.com/quote/VRT"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("nvent_electric.yaml", "investors.nvent.com", '    - description: "nVent Electric investor relations"\n      url: "https://finance.yahoo.com/quote/NVT"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("bloom_energy.yaml", "investors.bloomenergy.com", '    - description: "Bloom Energy investor relations"\n      url: "https://finance.yahoo.com/quote/BE"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("microsoft.yaml", "investor.microsoft.com", '    - description: "Microsoft investor relations"\n      url: "https://finance.yahoo.com/quote/MSFT"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("amazon.yaml", "ir.aboutamazon.com", '    - description: "Amazon investor relations"\n      url: "https://finance.yahoo.com/quote/AMZN"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("alphabet.yaml", "abc.xyz/investor", '    - description: "Alphabet investor relations"\n      url: "https://finance.yahoo.com/quote/GOOGL"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("coreweave.yaml", "investors.coreweave.com", '    - description: "CoreWeave investor relations"\n      url: "https://finance.yahoo.com/quote/CRWV"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("equinix.yaml", "investor.equinix.com", '    - description: "Equinix investor relations"\n      url: "https://finance.yahoo.com/quote/EQIX"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("digital_realty.yaml", "ir.digitalrealty.com", '    - description: "Digital Realty investor relations"\n      url: "https://finance.yahoo.com/quote/DLR"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("xai.yaml", "x.ai", '    - description: "xAI (Grok) corporate website"\n      url: "https://x.ai/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("mistral_ai.yaml", "mistral.ai", '    - description: "Mistral AI corporate website and La Plateforme docs"\n      url: "https://mistral.ai/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("salesforce.yaml", "investor.salesforce.com", '    - description: "Salesforce investor relations"\n      url: "https://finance.yahoo.com/quote/CRM"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("servicenow.yaml", "investors.servicenow.com", '    - description: "ServiceNow investor relations"\n      url: "https://finance.yahoo.com/quote/NOW"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("palantir.yaml", "investors.palantir.com", '    - description: "Palantir investor relations"\n      url: "https://finance.yahoo.com/quote/PLTR"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("harvey_ai.yaml", "harvey.ai", '    - description: "Harvey AI corporate website"\n      url: "https://www.harvey.ai/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("glean.yaml", "glean.com", '    - description: "Glean Technologies corporate website"\n      url: "https://www.glean.com/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
    ("writer.yaml", "writer.com", '    - description: "Writer Inc corporate website"\n      url: "https://writer.com/"\n      accessed: "2026-07-07"\n      is_sourced_fact: false'),
]

errors = []
updated = []

for filename, bare_url, new_source in additions:
    filepath = os.path.join(BASE, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix bare URL if needed (wrap with https://)
    if bare_url:
        old = f'url: "{bare_url}"'
        new = f'url: "https://{bare_url}"'
        if old in content:
            content = content.replace(old, new)
        else:
            errors.append(f"WARNING: bare URL not found in {filename}: {bare_url}")

    # Find the sources: block and locate the first is_sourced_fact line
    sources_idx = content.find("  sources:\n")
    if sources_idx == -1:
        errors.append(f"ERROR: no sources: block in {filename}")
        continue

    is_sourced_idx = content.find("      is_sourced_fact:", sources_idx)
    if is_sourced_idx == -1:
        errors.append(f"ERROR: no is_sourced_fact in {filename}")
        continue

    end_of_line = content.find("\n", is_sourced_idx)
    if end_of_line == -1:
        errors.append(f"ERROR: no newline after is_sourced_fact in {filename}")
        continue

    # Insert the new source block after the first is_sourced_fact line
    content = content[:end_of_line+1] + new_source + "\n" + content[end_of_line+1:]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    updated.append(filename)

print(f"Updated {len(updated)} files.")
for f in updated:
    print(f"  OK: {f}")
if errors:
    print("\nErrors/warnings:")
    for e in errors:
        print(f"  {e}")
