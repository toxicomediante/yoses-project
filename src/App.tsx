import { useEffect, useMemo, useState } from 'react'
import { getAllEntries, getEntry, saveEntry } from './storage'
import type { AlcoholStatus, DailyEntry } from './types'
import ritualNebula from './assets/ritual-nebula.jpg'
import ritualMoon from './assets/ritual-moon.png'

const ES_MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
const ES_WEEKDAYS = ['L','M','X','J','V','S','D']
const ES_DAYS_LONG = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO']

function localIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7
}

function BottleIcon({active=false}:{active?:boolean}) {
  return <svg className={`mini-icon ${active ? 'active' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6v3l1.5 2v12.5A2.5 2.5 0 0 1 14 22h-4a2.5 2.5 0 0 1-2.5-2.5V7L9 5V2Z"/><path d="M9 9h6M10 14l2-2 2 2"/></svg>
}
function CanIcon({active=false}:{active?:boolean}) {
  return <svg className={`mini-icon ${active ? 'danger' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10l1 2-1 16H7L6 5l1-2Z"/><path d="M8 6h8M9 10l6 6M15 10l-6 6"/></svg>
}
function DumbbellIcon({active=false}:{active?:boolean}) {
  return <svg className={`mini-icon ${active ? 'active' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/></svg>
}
function GearIcon(){return <svg viewBox="0 0 24 24" className="line-icon"><path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 0 0 12 8.5Z"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.4 3h-4.8l-.4 3.1a8 8 0 0 0-1.8 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.8 1l.4 3.1h4.8l.4-3.1a8 8 0 0 0 1.8-1l2.4 1 2-3.4L19 13a7 7 0 0 0 0-1Z"/></svg>}
function BackIcon(){return <svg viewBox="0 0 24 24" className="line-icon"><path d="m15 5-7 7 7 7"/></svg>}

function RitualHeader({compact=false}:{compact?:boolean}) {
  return <div className={`ritual ${compact ? 'compact' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMid meet">
      <g className="ritual-moon-layer">
        <image href={ritualMoon} x="134" y="31" width="92" height="92" preserveAspectRatio="xMidYMid meet" className="ritual-moon-image" />
      </g>

      <g className="ritual-lines ritual-structure">
        <path d="M180 4v138"/>
        <path d="M90 86h180"/>
        <path d="M180 24 145 78l35 46 35-46Z"/>
        <circle cx="180" cy="77" r="46"/>
        <circle cx="180" cy="77" r="30" strokeDasharray="3 6"/>
        <path d="M144 20a50 50 0 0 0 72 0 43 43 0 0 1-72 0Z"/>
        <path d="M155 20c8 8 17 12 25 12s17-4 25-12"/>
      </g>

      <circle className="ritual-core" cx="180" cy="77" r="13"/>
    </svg>
  </div>
}

function Rating({label, value, onChange}:{label:string,value?:number,onChange:(value:number)=>void}) {
  return <div className="rating-row">
    <span>{label}</span>
    <div className="rating-dots" role="group" aria-label={label}>
      {[1,2,3,4,5].map(n => <button key={n} className={value === n ? 'selected' : ''} onClick={() => onChange(n)} aria-label={`${label}: ${n} de 5`}>{n}</button>)}
    </div>
    <strong>{value ? `${value}/5` : '—'}</strong>
  </div>
}

function App() {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  async function refresh() {
    setEntries(await getAllEntries())
    setLoading(false)
  }

  useEffect(() => { void refresh() }, [])

  const entriesByDate = useMemo(() => new Map(entries.map(e => [e.date, e])), [entries])
  const monthPrefix = `${cursor.getFullYear()}-${`${cursor.getMonth()+1}`.padStart(2,'0')}`
  const monthEntries = entries.filter(e => e.date.startsWith(monthPrefix))
  const noAlcoholCount = monthEntries.filter(e => e.alcohol === 'none').length
  const trainingCount = monthEntries.filter(e => e.trained).length

  const streak = useMemo(() => {
    let count = 0
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEntry = entriesByDate.get(localIsoDate(d))
    if (!todayEntry || todayEntry.alcohol === null) d.setDate(d.getDate() - 1)
    while (true) {
      const entry = entriesByDate.get(localIsoDate(d))
      if (!entry || entry.alcohol !== 'none') break
      count += 1
      d.setDate(d.getDate() - 1)
    }
    return count
  }, [entriesByDate, today])

  if (selectedDate) {
    return <DayScreen date={selectedDate} onBack={async () => { await refresh(); setSelectedDate(null) }} />
  }

  const year = cursor.getFullYear(); const month = cursor.getMonth()
  const total = daysInMonth(year, month)
  const offset = mondayIndex(new Date(year, month, 1).getDay())
  const cells: Array<number|null> = [...Array(offset).fill(null), ...Array.from({length:total},(_,i)=>i+1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const shiftMonth = (delta:number) => setCursor(new Date(year, month + delta, 1))

  return <main className="app-shell">
    <section className="phone-surface home-screen">
      <div className="header-nebula" style={{backgroundImage:`url(${ritualNebula})`}} aria-hidden="true" />
      <header className="topbar">
        <div className="brand"><span>YOSE'S</span><small>PROJECT</small></div>
        <button className="icon-button" onClick={() => setShowSettings(v=>!v)} aria-label="Ajustes"><GearIcon/></button>
      </header>

      <div className="hero-copy left">DISCIPLINA<br/>CONSTRUYE<br/><em>LIBERTAD</em></div>
      <div className="hero-copy right">MENTE<br/>MÁS CLARA<br/><em>CUERPO MÁS FUERTE</em></div>
      <RitualHeader />

      <div className="month-title-row">
        <button onClick={()=>shiftMonth(-1)} aria-label="Mes anterior">‹</button>
        <div><h1>{ES_MONTHS[month]} / {year}</h1><p>EL MISMO COMBATE. UNA VERSIÓN MEJOR.</p></div>
        <button onClick={()=>shiftMonth(1)} aria-label="Mes siguiente">›</button>
      </div>

      <section className="metrics-grid">
        <article><strong>{noAlcoholCount}</strong><span>DÍAS SIN<br/>ALCOHOL</span></article>
        <article><strong>{trainingCount}</strong><span>SESIONES DE<br/>ENTRENO</span></article>
        <article><strong>{streak}</strong><span>RACHA<br/>ACTUAL</span></article>
      </section>

      <section className="calendar-card">
        <div className="weekdays">{ES_WEEKDAYS.map(d=><span key={d}>{d}</span>)}</div>
        <div className="calendar-grid">
          {cells.map((day, idx) => {
            if (!day) return <div className="day-cell ghost" key={`g-${idx}`} />
            const date = `${year}-${`${month+1}`.padStart(2,'0')}-${`${day}`.padStart(2,'0')}`
            const entry = entriesByDate.get(date)
            const isToday = date === localIsoDate(today)
            return <button key={date} onClick={()=>setSelectedDate(date)} className={`day-cell ${isToday ? 'today':''} ${entry ? 'logged':''}`}>
              <span className="day-number">{day}</span>
              <span className="day-icons">
                {entry?.alcohol === 'none' && <BottleIcon active/>}
                {entry?.alcohol === 'alcohol' && <CanIcon active/>}
                {entry?.trained && <DumbbellIcon active/>}
              </span>
              {!entry && <i className="unlogged-dot" />}
            </button>
          })}
        </div>
        <div className="legend"><span><BottleIcon active/> SIN ALCOHOL</span><span><CanIcon active/> ALCOHOL</span><span><DumbbellIcon active/> ENTRENO</span></div>
      </section>

      <button className="primary-button" onClick={()=>setSelectedDate(localIsoDate(today))}>REGISTRAR HOY <span>→</span></button>
      <button className="secondary-button" onClick={()=>alert('Histórico: siguiente pantalla del vertical slice.')}>VER HISTÓRICO</button>
      <footer>DISCIPLINA HOY. UN MAÑANA DIFERENTE.</footer>

      {showSettings && <div className="settings-popover"><strong>AJUSTES</strong><p>Las notificaciones y la hora diaria se incorporarán en la fase Android/Capacitor.</p></div>}
      {loading && <div className="loading">CARGANDO REGISTRO…</div>}
    </section>
  </main>
}

function DayScreen({date,onBack}:{date:string,onBack:()=>void}) {
  const parsed = useMemo(() => {
    const [y,m,d] = date.split('-').map(Number)
    return new Date(y,m-1,d)
  }, [date])
  const [alcohol,setAlcohol] = useState<AlcoholStatus>(null)
  const [trained,setTrained] = useState(false)
  const [trainingMinutes,setTrainingMinutes] = useState<number | undefined>()
  const [trainingType,setTrainingType] = useState('Fuerza')
  const [energy,setEnergy] = useState<number | undefined>()
  const [mood,setMood] = useState<number | undefined>()
  const [sleep,setSleep] = useState<number | undefined>()
  const [notes,setNotes] = useState('')
  const [saved,setSaved] = useState(false)

  useEffect(() => {
    void getEntry(date).then(e => {
      if (!e) return
      setAlcohol(e.alcohol); setTrained(e.trained); setTrainingMinutes(e.trainingMinutes); setTrainingType(e.trainingType || 'Fuerza')
      setEnergy(e.energy); setMood(e.mood); setSleep(e.sleep); setNotes(e.notes || '')
    })
  }, [date])

  async function handleSave() {
    const entry: DailyEntry = { date, alcohol, trained, trainingMinutes: trained ? trainingMinutes : undefined, trainingType: trained ? trainingType : undefined, energy, mood, sleep, notes: notes.trim() || undefined, updatedAt: new Date().toISOString() }
    await saveEntry(entry)
    setSaved(true)
    window.setTimeout(()=>setSaved(false),1500)
  }

  return <main className="app-shell">
    <section className="phone-surface day-screen">
      <div className="header-nebula compact" style={{backgroundImage:`url(${ritualNebula})`}} aria-hidden="true" />
      <header className="topbar detail-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Volver"><BackIcon/></button>
        <div className="brand mini"><span>YOSE'S</span><small>PROJECT</small></div>
        <div className="topbar-spacer" />
      </header>
      <RitualHeader compact/>
      <div className="detail-heading">
        <h1>{ES_DAYS_LONG[parsed.getDay()]} / {parsed.getDate()} {ES_MONTHS[parsed.getMonth()]}</h1>
        <p>REGISTRA EL DÍA. CONSTRUYE EL PATRÓN.</p>
      </div>

      <section className="entry-card">
        <div className="section-title"><BottleIcon/><span>ALCOHOL</span></div>
        <div className="choice-grid">
          <button className={`choice ${alcohol==='none'?'selected':''}`} onClick={()=>setAlcohol('none')}><BottleIcon active/><span>SIN ALCOHOL</span></button>
          <button className={`choice ${alcohol==='alcohol'?'danger-selected':''}`} onClick={()=>setAlcohol('alcohol')}><CanIcon active/><span>HE BEBIDO</span></button>
        </div>
        <p className="microcopy">{alcohol===null?'Sin registrar': alcohol==='none'?'Día marcado sin consumo de alcohol.':'Día marcado con consumo de alcohol.'}</p>
      </section>

      <section className="entry-card">
        <div className="section-title"><DumbbellIcon/><span>ENTRENAMIENTO</span></div>
        <button className={`training-toggle ${trained?'on':''}`} onClick={()=>setTrained(v=>!v)}><DumbbellIcon active/><span>{trained?'HE ENTRENADO HOY':'SIN ENTRENAMIENTO'}</span><b>{trained?'✓':'+'}</b></button>
        {trained && <div className="training-fields">
          <label>Tipo<select value={trainingType} onChange={(e:any)=>setTrainingType(e.target.value)}><option>Fuerza</option><option>Boxeo</option><option>Cardio</option><option>Movilidad</option><option>Otro</option></select></label>
          <label>Duración<input type="number" min="1" max="600" placeholder="min" value={trainingMinutes ?? ''} onChange={(e:any)=>setTrainingMinutes(e.target.value ? Number(e.target.value) : undefined)}/></label>
          <div className="exercise-placeholder"><strong>DETALLE DE EJERCICIOS</strong><span>El catálogo completo de ejercicios, series, repeticiones, peso y RPE entra en la siguiente iteración.</span></div>
        </div>}
      </section>

      <section className="entry-card">
        <div className="section-title"><span className="sigil">✦</span><span>ESTADO DEL DÍA</span></div>
        <Rating label="ENERGÍA" value={energy} onChange={setEnergy}/>
        <Rating label="ÁNIMO" value={mood} onChange={setMood}/>
        <Rating label="SUEÑO" value={sleep} onChange={setSleep}/>
      </section>

      <section className="entry-card notes-card">
        <div className="section-title"><span className="sigil">⌁</span><span>NOTAS</span></div>
        <textarea value={notes} onChange={(e:any)=>setNotes(e.target.value)} placeholder="Cómo ha ido el día, sensaciones, contexto del entrenamiento…" rows={4}/>
      </section>

      <button className="primary-button" onClick={handleSave}>{saved?'GUARDADO ✓':'GUARDAR REGISTRO'} <span>{saved?'':'→'}</span></button>
      <button className="secondary-button" onClick={onBack}>VOLVER AL CALENDARIO</button>
      <footer>DISCIPLINA HOY. UN MAÑANA DIFERENTE.</footer>
    </section>
  </main>
}

export default App
