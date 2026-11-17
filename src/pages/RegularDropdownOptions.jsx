import { useState } from 'react'
import { defaultRegularDropdownOptions, getRegularDropdownOptions, saveRegularDropdownOptions } from './regularDropdownOptions.js'
import './RegularDropdownOptions.css'

export default function RegularDropdownOptions() {
  const [options, setOptions] = useState(getRegularDropdownOptions)
  const [newUnit, setNewUnit] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [notice, setNotice] = useState('')

  function updateOptions(next) {
    setOptions(next)
    saveRegularDropdownOptions(next)
  }

  function addOption(list, value, reset) {
    const cleaned = value.trim().replace(/\s+/g, ' ')
    if (!cleaned) return
    if (options[list].some((item) => item.toLocaleLowerCase() === cleaned.toLocaleLowerCase())) {
      setNotice('Nasa list na ang option na iyan.')
      return
    }
    updateOptions({ ...options, [list]: [...options[list], cleaned] })
    reset('')
    setNotice('Naidagdag ang dropdown option.')
  }

  function removeOption(list, value) {
    updateOptions({ ...options, [list]: options[list].filter((item) => item !== value) })
    setNotice(`Tinanggal ang “${value}” sa options list.`)
  }

  function restoreDefaults() {
    const restored = { units: [...defaultRegularDropdownOptions.units], categories: [...defaultRegularDropdownOptions.categories] }
    updateOptions(restored)
    setNotice('Naibalik ang default options.')
  }

  return (
    <div className="section-page-content regular-options-page">
      <div className="regular-options-intro">
        <div><span className="ledger-kicker">E-STOCK / REGULAR</span><h2>Dropdown Settings</h2><p>Magdagdag o magtanggal ng choices na lalabas sa Regular inventory forms at filters.</p></div>
        <button className="regular-options-restore" type="button" onClick={restoreDefaults}>Restore defaults</button>
      </div>
      {notice && <p className="regular-options-notice" role="status">{notice}</p>}
      <div className="regular-options-grid">
        <OptionCard title="Unit of Measure" entries={options.units} value={newUnit} onChange={setNewUnit} onAdd={() => addOption('units', newUnit, setNewUnit)} onDelete={(value) => removeOption('units', value)} />
        <OptionCard title="Category" entries={options.categories} value={newCategory} onChange={setNewCategory} onAdd={() => addOption('categories', newCategory, setNewCategory)} onDelete={(value) => removeOption('categories', value)} />
      </div>
      <p className="regular-options-footnote">Sample UI settings · saved in this browser only</p>
    </div>
  )
}

function OptionCard({ title, entries, value, onChange, onAdd, onDelete }) {
  return (
    <section className="dashboard-card regular-options-card">
      <div className="regular-options-card-heading"><div><h3>{title}</h3><p>{entries.length} dropdown options</p></div><span>{String(entries.length).padStart(2, '0')}</span></div>
      <form className="regular-options-add" onSubmit={(event) => { event.preventDefault(); onAdd() }}>
        <input aria-label={`New ${title}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={`Add ${title.toLowerCase()}`} />
        <button className="regular-add-item-button" type="submit">+ Add</button>
      </form>
      <ul className="regular-options-list">
        {entries.map((entry) => <li key={entry}><span>{entry}</span><button type="button" onClick={() => onDelete(entry)} aria-label={`Delete ${entry}`}>Delete</button></li>)}
        {entries.length === 0 && <li className="regular-options-empty">No options yet. Add one above.</li>}
      </ul>
    </section>
  )
}
