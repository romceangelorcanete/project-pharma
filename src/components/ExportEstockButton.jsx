import { createEstockWorkbook } from '../utils/xlsxTemplateExport.js'

export default function ExportEstockButton({ rows = [], activeSheet = 'regular', stockMonth = '2026-11' }) {
  async function downloadWorkbook() {
    try {
      const [regularModule, donationModule, mhmapModule] = await Promise.all([
        import('../pages/RegularInventory.jsx'),
        import('../pages/DonationInventory.jsx'),
        import('../pages/MhmapInventory.jsx'),
      ])
      const workbookRows = {
        regularRows: activeSheet === 'regular' ? rows : regularModule.sampleRegularRows,
        donationRows: activeSheet === 'donation' ? rows : donationModule.sampleDonationRows,
        mhmapRows: activeSheet === 'mhmap' ? rows : mhmapModule.sampleMhmapRows,
        stockMonth,
      }
      const workbook = await createEstockWorkbook(workbookRows)
      const url = URL.createObjectURL(workbook)
      const link = document.createElement('a')
      link.href = url
      link.download = 'E-STOCK.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Hindi ma-download ang E-STOCK.xlsx. Pakisubukan ulit.')
    }
  }

  return (
    <button className="regular-export-button" type="button" onClick={downloadWorkbook}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 13v3h12v-3" /></svg>
      Export Excel
    </button>
  )
}
