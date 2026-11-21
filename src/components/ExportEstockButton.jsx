import { createEstockWorkbook } from '../utils/xlsxTemplateExport.js'
import { readInventoryRows } from '../hooks/useInventoryRows.js'

export default function ExportEstockButton({ rows, regularRows, donationRows, mhmapRows, preparedBy = '', preparedByPosition = '', activeSheet = 'regular', stockMonth = '2026-11', consumptionYear = 2026 }) {
  async function downloadWorkbook() {
    try {
      const [regularModule, donationModule, mhmapModule] = await Promise.all([
        import('../pages/RegularInventory.jsx'),
        import('../pages/DonationInventory.jsx'),
        import('../pages/MhmapInventory.jsx'),
      ])
      const resolveRows = (providedRows, section, fallbackRows) => {
        if (providedRows !== undefined && providedRows !== null) return providedRows
        if (activeSheet === section && rows !== undefined) return rows
        return readInventoryRows(section, fallbackRows, stockMonth)
      }
      const workbookRows = {
        regularRows: resolveRows(regularRows, 'regular', regularModule.sampleRegularRows),
        donationRows: resolveRows(donationRows, 'donation', donationModule.sampleDonationRows),
        mhmapRows: resolveRows(mhmapRows, 'mhmap', mhmapModule.sampleMhmapRows),
        preparedBy,
        preparedByPosition,
        stockMonth,
        consumptionYear,
      }
      const workbook = await createEstockWorkbook(workbookRows)
      const url = URL.createObjectURL(workbook)
      const link = document.createElement('a')
      link.href = url
      const [year, month] = stockMonth.split('-').map(Number)
      const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
      link.download = `E-STOCK_${monthName}_${year}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Hindi ma-download ang E-STOCK workbook. Pakisubukan ulit.')
    }
  }

  return (
    <button className="regular-export-button" type="button" onClick={downloadWorkbook}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 13v3h12v-3" /></svg>
      Export Excel
    </button>
  )
}
