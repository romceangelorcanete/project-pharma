export const defaultRegularDropdownOptions = {
  units: ['tablet', 'vial', 'ampule', 'capsule', 'bottle', 'suspension', 'syrup', 'drops', 'inhalation', 'eye drops', 'cream', 'suppository', 'tab', 'powder', 'parenteral', 'ointment', 'nebule', 'syringe', 'supp', 'spray', 'sachet', 'gargle', 'eye drop', 'carpule'],
  categories: ['ANTI-HYPERTENSIVES', 'ANTI-THROMBOTICS', 'ANTI-ASTHMA & COPD', 'ANTI-DIABETICS', 'ANTI-DYSLIPIDEMIA', 'ANTI-BIOTICS / MICROBIALS', 'NERVOUS SYSTEM', 'SUPPORTIVE / OTHER THERAPHY', 'VITAMINS', 'ANTI-ALLERGY/HISTAMINE', 'EXPANDERS', 'DANGEROUS/REGULATED', 'ANALGESICS', 'ANTIDEPRESSANTS / PSYCHOTICS', 'ANTI-GOUT', 'ANTI-VERTIGO', 'CORTICOSTEROIDS', 'DIURETICS', 'ANESTHESIA / OR', 'IV FLUIDS', 'GASTROINTESTINAL', 'ELECTROLYTES', 'OPTHALMIC PREPARATIONS', 'VACCINES / BIOLOGICALS', 'ANTI-THYROID AGENTS', 'MUSCLE RELAXANT', 'SURFACTANT', 'SMALL VIALS', 'COUGH SUPPRESSANTS', 'ANTI-NEOPLASTICS / ONCO', 'CARDIOVASCULAR', 'BRONCHODILATORS', 'NEUROMUSCULAR BLOCKER', 'ANTI-CHOLINERGIC', 'IMMUNOSUPPRESSANTS', 'LAXATIVE', 'ANTIDOTE', 'ANTI-EPILEPTIC', 'Total Parenteral Nutrition'],
}

const storageKey = 'pharma-regular-dropdown-options'

export function getRegularDropdownOptions() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null')
    return {
      units: Array.isArray(saved?.units) ? saved.units : [...defaultRegularDropdownOptions.units],
      categories: Array.isArray(saved?.categories) ? saved.categories : [...defaultRegularDropdownOptions.categories],
    }
  } catch {
    return { units: [...defaultRegularDropdownOptions.units], categories: [...defaultRegularDropdownOptions.categories] }
  }
}

export function saveRegularDropdownOptions(options) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(options))
  } catch {
    // Keep the current screen usable if browser storage is unavailable.
  }
}
