import DonationInventory from './DonationInventory.jsx'
import './MhmapInventory.css'

function inferUnit(name) {
  const normalized = name.toLowerCase()
  if (/\btablet\b/.test(normalized)) return 'tablet'
  if (/\bcapsule\b/.test(normalized)) return 'capsule'
  if (/\bsyrup\b/.test(normalized)) return 'syrup'
  if (/\bbottle\b/.test(normalized)) return 'bottle'
  if (/\bamp(?:ule)?\b/.test(normalized)) return 'ampule'
  return ''
}

export const sampleMhmapRows = [
  { no: 1, name: 'Carbamazepine 200mg tablet', expiry: '', lot: 'PH21-79\n20072773', beginning: 0, deliveries: [{ date: '7/10/2025', qty: 100, vendor: 'NO PAPERS' }, { date: '12/12/2025', qty: 100, vendor: '' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 2, name: 'Chlorpromazine HCl 200mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 3, name: 'Clozapine 100mg tablet', expiry: '2/1/2027', lot: 'B344K015', beginning: 0, deliveries: [{ date: '5/19/2025', qty: 100, vendor: '' }, { date: '11/30/2025', qty: 550, vendor: '' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 4, name: 'Diphenhydramine HCl 50mg/ml, 1ml ampule', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 5, name: 'Donepezil HCl 10mg tablet', expiry: '07/01/2027', lot: 'BZ01K010', beginning: 100, deliveries: [{ date: '12/15/2025', qty: 100, vendor: 'DOHCLCHD' }], daily: {}, ending: 100, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 6, name: 'Escitalopram oxalate 10mg tablet', expiry: '', lot: '', beginning: 73, deliveries: [], daily: {}, ending: 73, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 7, name: 'Fluoxetine 20mg capsule', expiry: '2/1/2027', lot: 'PH-2519', beginning: 0, deliveries: [{ date: '3/10/2026', qty: 150, vendor: 'DOHCLHD' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 8, name: 'Fluphenazine Decanoate 25mg/ml, 1ml amp', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 9, name: 'Haloperidol 5mg tablet', expiry: '11/30/2027', lot: 'CFB24004', beginning: 88, deliveries: [{ date: '7/15/2026', qty: 100, vendor: 'BPHO' }], daily: {}, ending: 88, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 10, name: 'Haloperidol 5mg/ml 1ml solution for injection ampule', expiry: '11/30/2027', lot: '243532', beginning: 3, deliveries: [{ date: '7/15/2026', qty: 3, vendor: 'BPHO' }], daily: {}, ending: 3, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 11, name: 'Lamotrigine 100mg tablet', expiry: '12/2028', lot: 'B662L006', beginning: 90, deliveries: [{ date: '12/15/2025', qty: 90, vendor: 'DOHCLCHD' }], daily: {}, ending: 90, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 12, name: 'Lithium Carbonate 450mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 13, name: 'Memantine HCl 10mg tablet', expiry: '05/31/2027', lot: 'BDMGL004\nHYT2402', beginning: 0, deliveries: [{ date: '12/15/2025', qty: 290, vendor: 'DOHCLCHD' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 14, name: 'Olanzapine HCl 10mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 15, name: 'Quetiapine fumarate 200mg tablet', expiry: '9/1/2026', lot: 'BUX2303', beginning: 0, deliveries: [{ date: '6/5/2026', qty: 300, vendor: 'NCMH' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 16, name: 'Risperidone 2mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 17, name: 'Sertraline 50mg tablet', expiry: '10/2026', lot: '', beginning: 0, deliveries: [{ date: '7/15/2026', qty: 631, vendor: 'BPHO' }], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 18, name: 'Valproic acid 250mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 19, name: 'Valproic acid 500mg tablet', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
  { no: 20, name: 'Valproic acid 250mg/5ml syrup, 120ml bottle', expiry: '', lot: '', beginning: 0, deliveries: [], daily: {}, ending: 0, monthly: 0, weekly: [0, 0, 0, 0, 0] },
] .map((item) => ({ ...item, unit: inferUnit(item.name) }))

const mhmapWeeklyRanges = ['1-3', '4-10', '11-17', '18-24', '25-30']

export default function MhmapInventory({ stockMonth, onStockMonthChange, monthLabel, onOpenStockCard, stockCardReturnUpdater }) {
  return <DonationInventory stockMonth={stockMonth} onStockMonthChange={onStockMonthChange} monthLabel={monthLabel} onOpenStockCard={onOpenStockCard} stockCardReturnUpdater={stockCardReturnUpdater} inventoryType="mhmap" initialRows={sampleMhmapRows} weeklyRanges={mhmapWeeklyRanges} />
}
