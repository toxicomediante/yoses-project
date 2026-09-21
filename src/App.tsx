import { useEffect, useMemo, useRef, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { clearAllEntries, deleteEntry, getAllEntries, getEntry, recoverNativeStateIfNeeded, replaceAllEntries, saveEntry, saveTextFile, syncNativeWidgets, verifyBackupProtection } from './storage'
import type { AlcoholCategory, AlcoholStatus, DailyEntry, TrainingExercise } from './types'
import ritualNebula from './assets/ritual-nebula.png'
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

function localFileTimestamp(date=new Date()) {
  return `${localIsoDate(date)}-${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}${String(date.getSeconds()).padStart(2,'0')}`
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '""'
  return `"${String(value).replace(/"/g,'""')}"`
}

async function downloadCsv(filename:string, headers:string[], rows:Array<Array<unknown>>) {
  const csv='\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n')
  return saveTextFile(filename,csv,'text/csv')
}

function alcoholCsvValue(status:AlcoholStatus) {
  if(status==='none') return 'SIN_ALCOHOL'
  if(status==='alcohol') return 'CON_ALCOHOL'
  return ''
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
function TrashIcon(){return <svg viewBox="0 0 24 24" className="line-icon"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>}
function WeightIcon(){return <svg viewBox="0 0 24 24" className="line-icon"><path d="M5 5h14a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2Z"/><path d="M8 10a4 4 0 0 1 8 0M12 10l2-2"/></svg>}
function TimerIcon(){return <svg viewBox="0 0 24 24" className="line-icon"><path d="M9 2h6M12 6a8 8 0 1 1-8 8 8 8 0 0 1 8-8Z"/><path d="M12 10v4l3 2M17.5 5.5 19 4"/></svg>}

function RitualHeader({compact=false}:{compact?:boolean}) {
  return <div className={`ritual ${compact ? 'compact' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMid meet">
      <g className="ritual-emblem">
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
      </g>
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


const STRENGTH_EXERCISES: Record<string,string[]> = {
  'Pierna': ['Sentadilla con barra','Sentadilla frontal','Prensa de piernas','Peso muerto rumano','Zancadas','Extensión de cuádriceps','Curl femoral','Elevación de gemelos'],
  'Pecho': ['Press de banca plano','Press inclinado','Press con mancuernas','Fondos','Aperturas'],
  'Espalda': ['Remo con barra','Remo con mancuerna','Dominadas','Jalón al pecho','Peso muerto','Remo en máquina'],
  'Hombro': ['Press militar','Press con mancuernas','Elevaciones laterales','Pájaros','Face pull'],
  'Bíceps': ['Curl de bíceps','Curl martillo','Curl predicador'],
  'Tríceps': ['Press cerrado','Extensión de tríceps','Press francés','Fondos de tríceps'],
  'Core': ['Plancha','Crunch en polea','Elevación de piernas','Rueda abdominal'],
  'Otro': ['Otro']
}

function createStrengthExercise(): TrainingExercise {
  return { muscleGroup:'Pierna', name:'Sentadilla con barra', sets:[{}] }
}

interface AppSettings {
  reminderEnabled: boolean
  reminderTime: string
  reminderOnlyIfUnregistered: boolean
  animationsEnabled: boolean
  weeklyTrainingGoal: number
  targetWeightKg?: number
  plannedTrainingDays: number[]
  favoriteExercises: string[]
}

const DEFAULT_SETTINGS: AppSettings = {
  reminderEnabled: true,
  reminderTime: '21:30',
  reminderOnlyIfUnregistered: true,
  animationsEnabled: true,
  weeklyTrainingGoal: 3,
  plannedTrainingDays: [],
  favoriteExercises: []
}

function loadAppSettings(): AppSettings {
  try {
    const raw=localStorage.getItem('yoses-settings')
    return raw ? {...DEFAULT_SETTINGS,...JSON.parse(raw)} : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveAppSettings(settings:AppSettings) {
  localStorage.setItem('yoses-settings',JSON.stringify(settings))
  document.documentElement.classList.toggle('animations-off',!settings.animationsEnabled)
  void syncNativeWidgets()
}

function allStrengthExerciseNames() {
  return Array.from(new Set(Object.values(STRENGTH_EXERCISES).flat().filter(name=>name!=='Otro'))).sort((a,b)=>a.localeCompare(b,'es'))
}

type TimerPhase = 'idle' | 'prepare' | 'work' | 'rest' | 'done'

function formatClock(totalSeconds:number) {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
}

function IntervalTimerScreen({onBack}:{onBack:()=>void}) {
  const [workSec,setWorkSec] = useState(60)
  const [restSec,setRestSec] = useState(180)
  const [rounds,setRounds] = useState(5)
  const [prepSec,setPrepSec] = useState(10)
  const [soundEnabled,setSoundEnabled] = useState(true)
  const [vibrationEnabled,setVibrationEnabled] = useState(true)
  const [phase,setPhase] = useState<TimerPhase>('idle')
  const [round,setRound] = useState(1)
  const [running,setRunning] = useState(false)
  const [remainingMs,setRemainingMs] = useState(workSec * 1000)
  const [timerHydrated,setTimerHydrated] = useState(false)
  const [phaseEndAt,setPhaseEndAt] = useState<number | null>(null)
  const lastCueSecond = useRef<number | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const swipeStart = useRef<{x:number,y:number} | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('yoses-interval-timer')
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      if (Number.isFinite(parsed.workSec)) setWorkSec(parsed.workSec)
      if (Number.isFinite(parsed.restSec)) setRestSec(parsed.restSec)
      if (Number.isFinite(parsed.rounds)) setRounds(parsed.rounds)
      if (Number.isFinite(parsed.prepSec)) setPrepSec(parsed.prepSec)
      if (typeof parsed.soundEnabled === 'boolean') setSoundEnabled(parsed.soundEnabled)
      if (typeof parsed.vibrationEnabled === 'boolean') setVibrationEnabled(parsed.vibrationEnabled)
    } catch {}
    setTimerHydrated(true)
  }, [])

  useEffect(() => {
    localStorage.setItem('yoses-interval-timer', JSON.stringify({workSec,restSec,rounds,prepSec,soundEnabled,vibrationEnabled}))
    void syncNativeWidgets()
    if (phase === 'idle') setRemainingMs(workSec * 1000)
  }, [workSec,restSec,rounds,prepSec,soundEnabled,vibrationEnabled,phase])

  function phaseDurationSeconds(current:TimerPhase) {
    if (current === 'prepare') return prepSec
    if (current === 'work') return workSec
    if (current === 'rest') return restSec
    return workSec
  }

  function primeAudio() {
    if (!soundEnabled) return
    try {
      if (!audioContext.current) audioContext.current = new AudioContext()
      if (audioContext.current.state === 'suspended') void audioContext.current.resume()
    } catch {}
  }

  function cue(kind:'warning'|'work'|'rest'|'done') {
    if (vibrationEnabled && 'vibrate' in navigator) {
      if (kind === 'done') navigator.vibrate([120,80,120,80,220])
      else if (kind === 'work') navigator.vibrate([110,50,110])
      else navigator.vibrate(70)
    }
    if (!soundEnabled) return
    try {
      primeAudio()
      const ctx = audioContext.current
      if (!ctx) return
      const now = ctx.currentTime
      const frequencies = kind === 'done' ? [880,1100,1320] : [kind === 'work' ? 980 : kind === 'rest' ? 520 : 760]
      frequencies.forEach((frequency,index) => {
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.0001, now + index * .13)
        gain.gain.exponentialRampToValueAtTime(.16, now + index * .13 + .01)
        gain.gain.exponentialRampToValueAtTime(.0001, now + index * .13 + .11)
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.start(now + index * .13)
        oscillator.stop(now + index * .13 + .12)
      })
    } catch {}
  }

  function enterPhase(next:TimerPhase,nextRound=round) {
    lastCueSecond.current = null
    if (next === 'done') {
      setPhase('done')
      setRunning(false)
      setPhaseEndAt(null)
      setRemainingMs(0)
      cue('done')
      return
    }
    const seconds = phaseDurationSeconds(next)
    setRound(nextRound)
    setPhase(next)
    setRemainingMs(seconds * 1000)
    setPhaseEndAt(Date.now() + seconds * 1000)
    setRunning(true)
    if (next === 'work') cue('work')
    if (next === 'rest') cue('rest')
  }

  function advancePhase() {
    if (phase === 'prepare') return enterPhase('work',1)
    if (phase === 'work') {
      if (round >= rounds) return enterPhase('done',round)
      return enterPhase('rest',round)
    }
    if (phase === 'rest') return enterPhase('work',round + 1)
  }

  useEffect(() => {
    if (!running || !phaseEndAt || phase === 'idle' || phase === 'done') return
    const timer = window.setInterval(() => {
      const next = Math.max(0, phaseEndAt - Date.now())
      setRemainingMs(next)
      const whole = Math.ceil(next / 1000)
      if (whole > 0 && whole <= 3 && whole !== lastCueSecond.current) {
        lastCueSecond.current = whole
        cue('warning')
      }
      if (next <= 0) {
        window.clearInterval(timer)
        advancePhase()
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [running,phaseEndAt,phase,round,rounds,workSec,restSec,prepSec,soundEnabled,vibrationEnabled])

  function startTimer() {
    primeAudio()
    setRound(1)
    if (prepSec > 0) enterPhase('prepare',1)
    else enterPhase('work',1)
  }

  useEffect(() => {
    if (!timerHydrated || phase !== 'idle') return
    if (sessionStorage.getItem('yoses-timer-autostart') !== '1') return
    sessionStorage.removeItem('yoses-timer-autostart')
    window.setTimeout(() => startTimer(), 50)
  }, [timerHydrated])


  function pauseResume() {
    if (phase === 'idle' || phase === 'done') return
    if (running) {
      if (phaseEndAt) setRemainingMs(Math.max(0,phaseEndAt-Date.now()))
      setRunning(false)
      setPhaseEndAt(null)
    } else {
      setPhaseEndAt(Date.now()+remainingMs)
      setRunning(true)
    }
  }

  function resetTimer() {
    setRunning(false)
    setPhase('idle')
    setRound(1)
    setPhaseEndAt(null)
    setRemainingMs(workSec*1000)
    lastCueSecond.current = null
  }

  function applyPreset(work:number,rest:number,count:number,prep=10) {
    if (phase !== 'idle' && phase !== 'done') return
    setWorkSec(work); setRestSec(rest); setRounds(count); setPrepSec(prep); setPhase('idle'); setRemainingMs(work*1000)
  }

  const editable = phase === 'idle' || phase === 'done'
  const displaySeconds = remainingMs / 1000
  const totalSeconds = prepSec + rounds * workSec + Math.max(0,rounds-1) * restSec
  const totalPhaseMs = Math.max(1,phaseDurationSeconds(phase) * 1000)
  const progress = phase === 'idle' ? 0 : phase === 'done' ? 100 : Math.min(100,Math.max(0,(1 - remainingMs / totalPhaseMs) * 100))
  const phaseLabel = phase === 'idle' ? 'LISTO' : phase === 'prepare' ? 'PREPÁRATE' : phase === 'work' ? 'INTERVALO' : phase === 'rest' ? 'DESCANSO' : 'COMPLETADO'

  return <main className="app-shell">
    <section
      className="phone-surface timer-screen"
      onTouchStart={(e:any)=>{const t=e.changedTouches[0];swipeStart.current={x:t.clientX,y:t.clientY}}}
      onTouchEnd={(e:any)=>{const start=swipeStart.current;if(!start)return;const t=e.changedTouches[0];const dx=t.clientX-start.x;const dy=t.clientY-start.y;if(dx>70&&Math.abs(dx)>Math.abs(dy)*1.25)onBack();swipeStart.current=null}}
    >
      <div className="header-nebula timer-nebula" style={{backgroundImage:`url(${ritualNebula})`}} aria-hidden="true" />
      <header className="topbar detail-topbar timer-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Volver al calendario"><BackIcon/></button>
        <div className="brand mini detail-brand timer-brand"><span>YOSE'S</span><small>PROJECT</small></div>
        <div className="topbar-spacer" aria-hidden="true" />
      </header>

      <div className="detail-ritual-wrap timer-ritual-wrap">
        <RitualHeader compact/>
      </div>

      <div className="detail-heading timer-detail-heading">
        <div className="timer-heading-inline"><TimerIcon/><h1>INTERVALÓMETRO</h1></div>
        <p>FUERZA · INTERVALOS · CONTROL</p>
      </div>

      <section className={`timer-display-card phase-${phase}`}>
        <div className="timer-phase"><span>{phaseLabel}</span><b>{phase === 'idle' ? `${rounds} RONDAS` : phase === 'done' ? 'FIN' : `RONDA ${round} / ${rounds}`}</b></div>
        <div className="timer-dial" style={{'--timer-progress':`${progress}%`} as any}>
          <div className="timer-clock">{formatClock(displaySeconds)}</div>
        </div>
        <div className="timer-next">
          {phase === 'work' && round < rounds ? `SIGUIENTE · DESCANSO ${formatClock(restSec)}` :
           phase === 'rest' ? `SIGUIENTE · INTERVALO ${formatClock(workSec)}` :
           phase === 'prepare' ? `SIGUIENTE · INTERVALO ${formatClock(workSec)}` :
           phase === 'done' ? 'SESIÓN COMPLETADA' : `TOTAL · ${formatClock(totalSeconds)}`}
        </div>

        <div className="timer-controls">
          {(phase === 'idle' || phase === 'done') ? <button className="timer-start" onClick={startTimer}>COMENZAR <span>▶</span></button> :
          <>
            <button className="timer-control" onClick={pauseResume}>{running ? 'PAUSA' : 'REANUDAR'}</button>
            <button className="timer-control accent" onClick={advancePhase}>SALTAR</button>
            <button className="timer-control" onClick={resetTimer}>PARAR</button>
          </>}
        </div>
      </section>

      <section className="entry-card timer-settings-card">
        <div className="section-title"><TimerIcon/><span>CONFIGURACIÓN</span></div>
        <div className="timer-setting-grid">
          <label><span>INTERVALO</span><div><input disabled={!editable} type="number" min="1" max="3600" value={workSec} onChange={(e:any)=>setWorkSec(Math.max(1,Number(e.target.value)||1))}/><b>SEG</b></div></label>
          <label><span>DESCANSO</span><div><input disabled={!editable} type="number" min="0" max="3600" value={restSec} onChange={(e:any)=>setRestSec(Math.max(0,Number(e.target.value)||0))}/><b>SEG</b></div></label>
          <label><span>RONDAS</span><div><input disabled={!editable} type="number" min="1" max="99" value={rounds} onChange={(e:any)=>setRounds(Math.max(1,Number(e.target.value)||1))}/><b>×</b></div></label>
          <label><span>CUENTA ATRÁS</span><div><input disabled={!editable} type="number" min="0" max="60" value={prepSec} onChange={(e:any)=>setPrepSec(Math.max(0,Number(e.target.value)||0))}/><b>SEG</b></div></label>
        </div>
        <div className="timer-toggles">
          <button className={soundEnabled ? 'on' : ''} onClick={()=>setSoundEnabled(v=>!v)}><i>{soundEnabled?'✓':''}</i> SONIDO</button>
          <button className={vibrationEnabled ? 'on' : ''} onClick={()=>setVibrationEnabled(v=>!v)}><i>{vibrationEnabled?'✓':''}</i> VIBRACIÓN</button>
        </div>
      </section>

      <section className="entry-card presets-card">
        <div className="section-title"><span className="sigil">✦</span><span>PRESETS RÁPIDOS</span></div>
        <div className="preset-grid">
          <button disabled={!editable} onClick={()=>applyPreset(60,180,5)}><strong>FUERZA</strong><span>60 / 180 · 5×</span></button>
          <button disabled={!editable} onClick={()=>applyPreset(45,90,5)}><strong>HIPERTROFIA</strong><span>45 / 90 · 5×</span></button>
          <button disabled={!editable} onClick={()=>applyPreset(30,60,8)}><strong>RÁPIDO</strong><span>30 / 60 · 8×</span></button>
          <button disabled={!editable} onClick={()=>applyPreset(20,10,8)}><strong>TABATA</strong><span>20 / 10 · 8×</span></button>
        </div>
      </section>

      <button className="swipe-hint" onClick={onBack}>DESLIZA → PARA VOLVER AL CALENDARIO</button>
      <footer>EL TIEMPO TAMBIÉN SE ENTRENA.</footer>
    </section>
  </main>
}



type HistoryRange = '30' | '90' | 'all'

function parseLocalDate(value:string) {
  const [y,m,d]=value.split('-').map(Number)
  return new Date(y,m-1,d)
}

function shortDate(value:string) {
  const date=parseLocalDate(value)
  return `${date.getDate()} ${ES_MONTHS[date.getMonth()].slice(0,3)}`
}

function HistoryLineChart({
  series,
  yMin,
  yMax,
  emptyText
}:{
  series:Array<{label:string;points:Array<{date:string;value:number}>}>
  yMin?:number
  yMax?:number
  emptyText:string
}) {
  const all=series.flatMap(s=>s.points.map(p=>p.value))
  if(!all.length) return <div className="history-empty">{emptyText}</div>

  const width=320, height=150, padX=20, padTop=12, padBottom=26
  const min=yMin ?? Math.min(...all)
  const max=yMax ?? Math.max(...all)
  const spread=Math.max(.1,max-min)
  const dates=[...new Set(series.flatMap(s=>s.points.map(p=>p.date)))].sort()
  const xFor=(date:string)=>{
    const i=dates.indexOf(date)
    return dates.length<=1 ? width/2 : padX + i*((width-padX*2)/(dates.length-1))
  }
  const yFor=(value:number)=>padTop + (max-value)/spread*(height-padTop-padBottom)

  return <div className="history-chart-wrap">
    <svg className="history-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {[0,.25,.5,.75,1].map((n,i)=><line key={i} x1={padX} x2={width-padX} y1={padTop+n*(height-padTop-padBottom)} y2={padTop+n*(height-padTop-padBottom)} className="history-gridline"/>)}
      {series.map((s,sIndex)=>{
        if(!s.points.length) return null
        const d=s.points.map((p,i)=>`${i?'L':'M'} ${xFor(p.date)} ${yFor(p.value)}`).join(' ')
        return <g key={s.label} className={`history-series series-${sIndex}`}>
          <path d={d}/>
          {s.points.map(p=><circle key={p.date} cx={xFor(p.date)} cy={yFor(p.value)} r="3"><title>{`${s.label}: ${p.value} · ${shortDate(p.date)}`}</title></circle>)}
        </g>
      })}
    </svg>
    <div className="history-axis"><span>{shortDate(dates[0])}</span><span>{shortDate(dates[dates.length-1])}</span></div>
    {series.length>1&&<div className="history-legend">{series.map((s,i)=><span className={`series-${i}`} key={s.label}><i/>{s.label}</span>)}</div>}
  </div>
}


function SettingsScreen({entries,onBack,onDataChanged}:{entries:DailyEntry[];onBack:()=>void;onDataChanged:()=>void}) {
  const [settings,setSettings]=useState<AppSettings>(()=>loadAppSettings())
  const [timer,setTimer]=useState(()=>{
    try {
      const parsed=JSON.parse(localStorage.getItem('yoses-interval-timer')||'{}')
      return {workSec:parsed.workSec??60,restSec:parsed.restSec??180,rounds:parsed.rounds??5,prepSec:parsed.prepSec??10,soundEnabled:parsed.soundEnabled??true,vibrationEnabled:parsed.vibrationEnabled??true}
    } catch {
      return {workSec:60,restSec:180,rounds:5,prepSec:10,soundEnabled:true,vibrationEnabled:true}
    }
  })
  const [notice,setNotice]=useState('')
  const importRef=useRef<HTMLInputElement|null>(null)
  const weekdayNames=['L','M','X','J','V','S','D']

  useEffect(()=>{
    saveAppSettings(settings)
  },[settings])

  useEffect(()=>{
    localStorage.setItem('yoses-interval-timer',JSON.stringify(timer))
  },[timer])

  function updateSetting<K extends keyof AppSettings>(key:K,value:AppSettings[K]) {
    setSettings(current=>({...current,[key]:value}))
  }

  async function testNotification() {
    try {
      if(!('Notification' in window)) {
        setNotice('Las notificaciones del navegador no están disponibles aquí.')
        return
      }
      let permission=Notification.permission
      if(permission==='default') permission=await Notification.requestPermission()
      if(permission!=='granted') {
        setNotice('Permiso de notificaciones no concedido.')
        return
      }
      new Notification("YOSE'S PROJECT",{body:'Recordatorio diario de prueba. Registra el día y sigue construyendo el patrón.'})
      setNotice('Notificación de prueba enviada.')
    } catch {
      setNotice('No se pudo lanzar la notificación de prueba en este navegador.')
    }
  }

  function collectStrengthDrafts() {
    const drafts:Record<string,unknown>={}
    for(let i=0;i<localStorage.length;i++) {
      const key=localStorage.key(i)
      if(key?.startsWith('yoses-strength-draft-')) {
        try { drafts[key]=JSON.parse(localStorage.getItem(key)||'null') } catch {}
      }
    }
    return drafts
  }

  async function exportBackup() {
    const payload={
      app:"YOSE'S PROJECT",
      version:1,
      exportedAt:new Date().toISOString(),
      entries,
      settings,
      intervalTimer:timer,
      strengthDrafts:collectStrengthDrafts()
    }
    const filename=`yoses-project-backup-${localFileTimestamp()}.json`
    try {
      const path=await saveTextFile(filename,JSON.stringify(payload,null,2),'application/json')
      setNotice(`Copia guardada en ${path}.`)
    } catch (error) {
      console.error('No se pudo exportar la copia de seguridad.',error)
      setNotice('No se pudo guardar la copia de seguridad. Revisa el almacenamiento e inténtalo de nuevo.')
    }
  }

  async function importBackup(file:File) {
    try {
      const payload=JSON.parse(await file.text())
      if(payload.app && payload.app!=="YOSE'S PROJECT") throw new Error('Backup de otra aplicación')
      if(!Array.isArray(payload.entries)) throw new Error('Formato no válido')
      if(payload.entries.length===0 && entries.length>0) throw new Error('El backup está vacío')

      if(entries.length>0) {
        const safety={
          app:"YOSE'S PROJECT",
          version:2,
          exportedAt:new Date().toISOString(),
          entries,
          settings,
          intervalTimer:timer,
          strengthDrafts:collectStrengthDrafts()
        }
        await saveTextFile(
          `yoses-project-pre-import-${localFileTimestamp()}.json`,
          JSON.stringify(safety,null,2),
          'application/json'
        )
      }

      await replaceAllEntries(payload.entries as DailyEntry[])
      if(payload.settings) {
        const next={...DEFAULT_SETTINGS,...payload.settings}
        setSettings(next)
        saveAppSettings(next)
      }
      if(payload.intervalTimer) {
        setTimer(current=>({...current,...payload.intervalTimer}))
      }
      if(payload.strengthDrafts&&typeof payload.strengthDrafts==='object') {
        Object.entries(payload.strengthDrafts).forEach(([key,value])=>localStorage.setItem(key,JSON.stringify(value)))
      }
      await syncNativeWidgets()
      await onDataChanged()
      setNotice('Copia restaurada correctamente y protegida por el sistema de backup automático.')
    } catch (error) {
      console.error('No se pudo importar el backup.',error)
      setNotice('No se pudo importar la copia. El archivo no ha sustituido tus datos actuales.')
    }
  }

  async function verifyDataProtection() {
    setNotice('Verificando copias recuperables…')
    try {
      const status=await verifyBackupProtection()
      if(status.count>=2) {
        setNotice(`Protección OK · ${status.count} copias recuperables verificadas.`)
      } else if(status.count===1) {
        setNotice('Protección parcial · hay 1 copia recuperable. Genera también una copia manual.')
      } else {
        setNotice('No se ha podido verificar ninguna copia recuperable todavía.')
      }
    } catch (error) {
      console.error('No se pudo verificar el sistema de backup.',error)
      setNotice('No se pudo verificar la protección de datos.')
    }
  }

  async function deleteAllData() {
    const first=window.confirm('¿Borrar todos los registros, borradores y ajustes de YOSE’S PROJECT?')
    if(!first)return
    const second=window.confirm('Esta acción no se puede deshacer. ¿Confirmas el borrado total?')
    if(!second)return
    await clearAllEntries()
    const keys:string[]=[]
    for(let i=0;i<localStorage.length;i++) {
      const key=localStorage.key(i)
      if(key?.startsWith('yoses-')) keys.push(key)
    }
    keys.forEach(key=>localStorage.removeItem(key))
    setSettings(DEFAULT_SETTINGS)
    setTimer({workSec:60,restSec:180,rounds:5,prepSec:10,soundEnabled:true,vibrationEnabled:true})
    saveAppSettings(DEFAULT_SETTINGS)
    await onDataChanged()
    setNotice('Todos los datos locales han sido borrados.')
  }

  function toggleFavorite(name:string) {
    updateSetting('favoriteExercises',settings.favoriteExercises.includes(name)
      ? settings.favoriteExercises.filter(item=>item!==name)
      : [...settings.favoriteExercises,name])
  }

  function togglePlannedDay(day:number) {
    updateSetting('plannedTrainingDays',settings.plannedTrainingDays.includes(day)
      ? settings.plannedTrainingDays.filter(item=>item!==day)
      : [...settings.plannedTrainingDays,day].sort())
  }

  return <main className="app-shell">
    <section className="phone-surface settings-screen">
      <div className="header-nebula settings-nebula" style={{backgroundImage:`url(${ritualNebula})`}} aria-hidden="true" />
      <header className="topbar detail-topbar settings-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Volver"><BackIcon/></button>
        <div className="brand mini detail-brand"><span>YOSE'S</span><small>PROJECT</small></div>
        <div className="topbar-spacer" aria-hidden="true" />
      </header>
      <div className="detail-ritual-wrap settings-ritual-wrap"><RitualHeader compact/></div>
      <div className="detail-heading settings-heading">
        <div className="settings-heading-inline"><GearIcon/><h1>AJUSTES</h1></div>
        <p>CONFIGURA LA APP A TU MANERA</p>
      </div>

      <section className="entry-card settings-card">
        <div className="section-title"><span className="sigil">✦</span><span>RECORDATORIO DIARIO</span></div>
        <button className={`settings-toggle ${settings.reminderEnabled?'on':''}`} onClick={()=>updateSetting('reminderEnabled',!settings.reminderEnabled)}><span>ACTIVAR RECORDATORIO</span><i>{settings.reminderEnabled?'✓':''}</i></button>
        <label className="settings-field"><span>HORA</span><input type="time" value={settings.reminderTime} onChange={(e:any)=>updateSetting('reminderTime',e.target.value)} disabled={!settings.reminderEnabled}/></label>
        <button className={`settings-toggle ${settings.reminderOnlyIfUnregistered?'on':''}`} onClick={()=>updateSetting('reminderOnlyIfUnregistered',!settings.reminderOnlyIfUnregistered)} disabled={!settings.reminderEnabled}><span>SÓLO SI HOY NO ESTÁ REGISTRADO</span><i>{settings.reminderOnlyIfUnregistered?'✓':''}</i></button>
        <button className="settings-action" onClick={testNotification}>PROBAR NOTIFICACIÓN</button>
        <p className="settings-note">La hora queda configurada desde ya. La programación fiable con el teléfono bloqueado se activará en la APK Android.</p>
      </section>

      <section className="entry-card settings-card">
        <div className="section-title"><TimerIcon/><span>INTERVALÓMETRO</span></div>
        <div className="settings-number-grid">
          <label><span>INTERVALO</span><div><input type="number" min="1" value={timer.workSec} onChange={(e:any)=>setTimer(current=>({...current,workSec:Math.max(1,Number(e.target.value)||1)}))}/><b>SEG</b></div></label>
          <label><span>DESCANSO</span><div><input type="number" min="0" value={timer.restSec} onChange={(e:any)=>setTimer(current=>({...current,restSec:Math.max(0,Number(e.target.value)||0)}))}/><b>SEG</b></div></label>
          <label><span>RONDAS</span><div><input type="number" min="1" value={timer.rounds} onChange={(e:any)=>setTimer(current=>({...current,rounds:Math.max(1,Number(e.target.value)||1)}))}/><b>×</b></div></label>
          <label><span>CUENTA ATRÁS</span><div><input type="number" min="0" value={timer.prepSec} onChange={(e:any)=>setTimer(current=>({...current,prepSec:Math.max(0,Number(e.target.value)||0)}))}/><b>SEG</b></div></label>
        </div>
        <div className="settings-two-col">
          <button className={`settings-toggle ${timer.soundEnabled?'on':''}`} onClick={()=>setTimer(current=>({...current,soundEnabled:!current.soundEnabled}))}><span>SONIDO</span><i>{timer.soundEnabled?'✓':''}</i></button>
          <button className={`settings-toggle ${timer.vibrationEnabled?'on':''}`} onClick={()=>setTimer(current=>({...current,vibrationEnabled:!current.vibrationEnabled}))}><span>VIBRACIÓN</span><i>{timer.vibrationEnabled?'✓':''}</i></button>
        </div>
      </section>

      <section className="entry-card settings-card">
        <div className="section-title"><DumbbellIcon/><span>OBJETIVOS</span></div>
        <div className="settings-number-grid">
          <label><span>ENTRENOS / SEMANA</span><div><input type="number" min="1" max="7" value={settings.weeklyTrainingGoal} onChange={(e:any)=>updateSetting('weeklyTrainingGoal',Math.min(7,Math.max(1,Number(e.target.value)||1)))}/><b>×</b></div></label>
          <label><span>PESO OBJETIVO</span><div><input type="number" min="20" max="400" step="0.1" placeholder="—" value={settings.targetWeightKg??''} onChange={(e:any)=>updateSetting('targetWeightKg',e.target.value===''?undefined:Number(e.target.value))}/><b>KG</b></div></label>
        </div>
        <div className="planned-days"><span>DÍAS PREVISTOS DE ENTRENAMIENTO</span><div>{weekdayNames.map((name,index)=><button key={name} className={settings.plannedTrainingDays.includes(index)?'active':''} onClick={()=>togglePlannedDay(index)}>{name}</button>)}</div></div>
      </section>

      <section className="entry-card settings-card">
        <div className="section-title"><DumbbellIcon/><span>EJERCICIOS FAVORITOS</span></div>
        <p className="settings-note settings-note-top">Márcalos para poder priorizarlos en el registro de fuerza.</p>
        <div className="favorite-exercises">{allStrengthExerciseNames().map(name=><button key={name} className={settings.favoriteExercises.includes(name)?'active':''} onClick={()=>toggleFavorite(name)}><i>{settings.favoriteExercises.includes(name)?'✓':''}</i><span>{name}</span></button>)}</div>
      </section>

      <section className="entry-card settings-card">
        <div className="section-title"><span className="sigil">◌</span><span>APARIENCIA</span></div>
        <button className={`settings-toggle ${settings.animationsEnabled?'on':''}`} onClick={()=>updateSetting('animationsEnabled',!settings.animationsEnabled)}><span>ANIMACIONES Y LUNA</span><i>{settings.animationsEnabled?'✓':''}</i></button>
      </section>

      <section className="entry-card settings-card">
        <div className="section-title"><span className="sigil">⌁</span><span>DATOS</span></div>
        <div className="data-actions">
          <button onClick={exportBackup}>EXPORTAR COPIA DE SEGURIDAD</button>
          <button onClick={()=>importRef.current?.click()}>IMPORTAR COPIA</button>
          <input ref={importRef} className="hidden-file-input" type="file" accept="application/json,.json" onChange={(e:any)=>{const file=e.target.files?.[0];if(file)void importBackup(file);e.target.value=''}}/>
        </div>
        <p className="settings-note">La copia manual se guarda en Descargas/YOSES PROJECT. Además, la app mantiene una copia automática visible en Descargas/YOSES PROJECT/AUTO y tres snapshots internos rotatorios incluidos en la copia de Android.</p>
        <button className="settings-action" onClick={verifyDataProtection}>VERIFICAR PROTECCIÓN DE DATOS</button>
        <button className="danger-data-button" onClick={deleteAllData}><TrashIcon/> BORRAR TODOS LOS DATOS</button>
      </section>

      <section className="entry-card settings-card app-info-card">
        <div className="section-title"><span className="sigil">◇</span><span>APP</span></div>
        <div><span>YOSE'S PROJECT</span><b>v0.1.0</b></div>
        <div><span>ALMACENAMIENTO</span><b>LOCAL EN ESTE DISPOSITIVO</b></div>
        <div><span>REGISTROS</span><b>{entries.length}</b></div>
      </section>

      {notice&&<div className="settings-notice">{notice}</div>}
      <button className="secondary-button" onClick={onBack}>VOLVER</button>
      <footer>CONFIGURA LO NECESARIO. ENTRENA LO IMPORTANTE.</footer>
    </section>
  </main>
}

function HistoryScreen({entries,onBack}:{entries:DailyEntry[];onBack:()=>void}) {
  const [range,setRange]=useState<HistoryRange>('30')
  const [strengthExercise,setStrengthExercise]=useState('')
  const [exportNotice,setExportNotice]=useState('')
  const sorted=useMemo(()=>[...entries].sort((a,b)=>a.date.localeCompare(b.date)),[entries])

  const filtered=useMemo(()=>{
    if(range==='all') return sorted
    const days=Number(range)
    const cutoff=new Date()
    cutoff.setHours(0,0,0,0)
    cutoff.setDate(cutoff.getDate()-(days-1))
    return sorted.filter(entry=>parseLocalDate(entry.date)>=cutoff)
  },[sorted,range])

  const weightPoints=filtered.filter(e=>typeof e.weightKg==='number').map(e=>({date:e.date,value:e.weightKg as number}))
  const wellnessSeries=[
    {label:'ENERGÍA',points:filtered.filter(e=>typeof e.energy==='number').map(e=>({date:e.date,value:e.energy as number}))},
    {label:'ÁNIMO',points:filtered.filter(e=>typeof e.mood==='number').map(e=>({date:e.date,value:e.mood as number}))},
    {label:'SUEÑO',points:filtered.filter(e=>typeof e.sleep==='number').map(e=>({date:e.date,value:e.sleep as number}))}
  ]

  const registered=filtered.filter(e=>e.alcohol!==null || e.trained || e.weightKg!==undefined || e.energy!==undefined || e.mood!==undefined || e.sleep!==undefined)
  const noAlcohol=filtered.filter(e=>e.alcohol==='none').length
  const alcohol=filtered.filter(e=>e.alcohol==='alcohol').length
  const training=filtered.filter(e=>e.trained).length
  const registeredDays=registered.length
  const denom=Math.max(1,registeredDays)

  const exerciseNames=useMemo(()=>Array.from(new Set(sorted.flatMap(e=>(e.exercises||[]).map(ex=>ex.name)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es')),[sorted])
  useEffect(()=>{
    if(!strengthExercise && exerciseNames.length) setStrengthExercise(exerciseNames[0])
    else if(strengthExercise && !exerciseNames.includes(strengthExercise)) setStrengthExercise(exerciseNames[0]||'')
  },[exerciseNames,strengthExercise])

  const strengthData=sorted.flatMap(entry=>(entry.exercises||[])
    .filter(ex=>ex.name===strengthExercise)
    .map(ex=>{
      const reps=(ex.sets||[]).reduce((sum,set)=>sum+(set.reps||0),0)
      const load=ex.loadKg||0
      return {date:entry.date,load,volume:load*reps,reps}
    }))

  const latestWeight=weightPoints.at(-1)?.value
  const firstWeight=weightPoints[0]?.value
  const weightDelta=latestWeight!==undefined&&firstWeight!==undefined ? latestWeight-firstWeight : undefined
  const maxHabit=Math.max(1,noAlcohol,alcohol,training)

  async function exportCsv(filename:string,headers:string[],rows:Array<Array<unknown>>) {
    try {
      const path=await downloadCsv(filename,headers,rows)
      setExportNotice(`Archivo guardado en ${path}.`)
    } catch (error) {
      console.error('No se pudo exportar el CSV.',error)
      setExportNotice('No se pudo guardar el CSV. Revisa el almacenamiento e inténtalo de nuevo.')
    }
  }

  function exportDailyCsv() {
    void exportCsv(
      `yoses-project-diario-completo-${localIsoDate(new Date())}.csv`,
      ['fecha','peso_kg','energia','animo','sueno','alcohol','entreno','minutos_entreno','tipo_entrenamiento','notas'],
      sorted.map(entry=>[
        entry.date,
        entry.weightKg ?? '',
        entry.energy ?? '',
        entry.mood ?? '',
        entry.sleep ?? '',
        alcoholCsvValue(entry.alcohol),
        entry.trained ? 1 : 0,
        entry.trainingMinutes ?? '',
        entry.trainingType ?? '',
        entry.notes ?? ''
      ])
    )
  }

  function exportWeightCsv() {
    void exportCsv(
      `yoses-project-peso-${localIsoDate(new Date())}.csv`,
      ['fecha','peso_kg'],
      sorted.filter(entry=>typeof entry.weightKg==='number').map(entry=>[entry.date,entry.weightKg ?? ''])
    )
  }

  function exportWellnessCsv() {
    void exportCsv(
      `yoses-project-estado-del-dia-${localIsoDate(new Date())}.csv`,
      ['fecha','energia','animo','sueno','notas'],
      sorted
        .filter(entry=>entry.energy!==undefined || entry.mood!==undefined || entry.sleep!==undefined || Boolean(entry.notes))
        .map(entry=>[entry.date,entry.energy ?? '',entry.mood ?? '',entry.sleep ?? '',entry.notes ?? ''])
    )
  }

  function exportHabitsCsv() {
    const categoryValue=(entry:DailyEntry,category:AlcoholCategory)=>{
      if(entry.alcohol==='none') return 0
      if(entry.alcohol!=='alcohol' || !entry.alcoholCategories) return ''
      return entry.alcoholCategories.includes(category) ? 1 : 0
    }
    void exportCsv(
      `yoses-project-habitos-${localIsoDate(new Date())}.csv`,
      ['fecha','alcohol','cerveza','vino','destilados','cantidad_cerveza','cantidad_vino','cantidad_destilados','notas_alcohol','entreno'],
      sorted.map(entry=>[
        entry.date,
        alcoholCsvValue(entry.alcohol),
        categoryValue(entry,'beer'),
        categoryValue(entry,'wine'),
        categoryValue(entry,'spirits'),
        entry.alcoholAmounts?.beer ?? '',
        entry.alcoholAmounts?.wine ?? '',
        entry.alcoholAmounts?.spirits ?? '',
        entry.alcoholNotes ?? '',
        entry.trained ? 1 : 0
      ])
    )
  }

  function exportTrainingCsv() {
    const rows:Array<Array<unknown>>=[]
    sorted.forEach(entry=>{
      const exercises=entry.exercises ?? []
      if(!entry.trained && exercises.length===0) return
      if(exercises.length===0) {
        rows.push([entry.date,entry.trainingType ?? '',entry.trainingMinutes ?? '','','','','','',''])
        return
      }
      exercises.forEach(exercise=>{
        const sets=exercise.sets?.length ? exercise.sets : [{}]
        sets.forEach((set,index)=>{
          const load=typeof exercise.loadKg==='number' ? exercise.loadKg : null
          const reps=typeof set.reps==='number' ? set.reps : null
          rows.push([
            entry.date,
            entry.trainingType ?? '',
            entry.trainingMinutes ?? '',
            exercise.muscleGroup,
            exercise.name,
            load ?? '',
            index+1,
            reps ?? '',
            load!==null && reps!==null ? load*reps : ''
          ])
        })
      })
    })
    void exportCsv(
      `yoses-project-entrenamientos-${localIsoDate(new Date())}.csv`,
      ['fecha','tipo_entrenamiento','duracion_min','grupo_muscular','ejercicio','carga_kg','numero_serie','repeticiones','volumen_serie'],
      rows
    )
  }

  return <main className="app-shell">
    <section className="phone-surface history-screen">
      <div className="header-nebula history-nebula" style={{backgroundImage:`url(${ritualNebula})`}} aria-hidden="true" />
      <header className="topbar detail-topbar history-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Volver"><BackIcon/></button>
        <div className="brand mini detail-brand"><span>YOSE'S</span><small>PROJECT</small></div>
        <div className="topbar-spacer" aria-hidden="true" />
      </header>

      <div className="detail-ritual-wrap history-ritual-wrap"><RitualHeader compact/></div>
      <div className="detail-heading history-heading">
        <h1>DATA ANALYSIS</h1>
        <p>EVOLUCIÓN · PATRONES · PROGRESO REAL</p>
      </div>

      <div className="history-range">
        <button className={range==='30'?'active':''} onClick={()=>setRange('30')}>30 DÍAS</button>
        <button className={range==='90'?'active':''} onClick={()=>setRange('90')}>90 DÍAS</button>
        <button className={range==='all'?'active':''} onClick={()=>setRange('all')}>TODO</button>
      </div>

      <section className="entry-card history-card">
        <div className="history-card-head">
          <div><span>PESO</span><strong>{latestWeight!==undefined?`${latestWeight.toFixed(1)} KG`:'—'}</strong></div>
          {weightDelta!==undefined&&weightPoints.length>1&&<em>{weightDelta>0?'+':''}{weightDelta.toFixed(1)} KG</em>}
        </div>
        <HistoryLineChart series={[{label:'PESO',points:weightPoints}]} emptyText="Aún no hay suficientes registros de peso."/>
      </section>

      <section className="entry-card history-card">
        <div className="history-card-head"><div><span>ESTADO DEL DÍA</span><strong>ESCALA 1–5</strong></div></div>
        <HistoryLineChart series={wellnessSeries} yMin={1} yMax={5} emptyText="Registra energía, ánimo o sueño para empezar a ver la tendencia."/>
      </section>

      <section className="entry-card history-card">
        <div className="history-card-head"><div><span>HÁBITOS</span><strong>{registeredDays} DÍAS REGISTRADOS</strong></div></div>
        {registeredDays ? <div className="habit-bars">
          <div><label><span>SIN ALCOHOL</span><b>{noAlcohol}</b></label><i><em style={{width:`${noAlcohol/maxHabit*100}%`}}/></i></div>
          <div><label><span>CON ALCOHOL</span><b>{alcohol}</b></label><i><em style={{width:`${alcohol/maxHabit*100}%`}}/></i></div>
          <div><label><span>ENTRENAMIENTOS</span><b>{training}</b></label><i><em style={{width:`${training/maxHabit*100}%`}}/></i></div>
          <div className="habit-percentages">
            <span><b>{Math.round(noAlcohol/denom*100)}%</b>DÍAS SIN ALCOHOL</span>
            <span><b>{Math.round(training/denom*100)}%</b>DÍAS CON ENTRENO</span>
          </div>
        </div> : <div className="history-empty">Todavía no hay días registrados en este periodo.</div>}
      </section>

      <section className="entry-card history-card strength-history-card">
        <div className="history-card-head"><div><span>FUERZA</span><strong>EVOLUCIÓN POR EJERCICIO</strong></div></div>
        {exerciseNames.length ? <>
          <label className="history-exercise-select"><span>EJERCICIO</span><select value={strengthExercise} onChange={(e:any)=>setStrengthExercise(e.target.value)}>{exerciseNames.map(name=><option key={name}>{name}</option>)}</select></label>
          {strengthData.length ? <>
            <div className="strength-history-metrics">
              <span><small>ÚLTIMA CARGA</small><b>{strengthData.at(-1)?.load || 0} KG</b></span>
              <span><small>MEJOR VOLUMEN</small><b>{Math.round(Math.max(...strengthData.map(d=>d.volume)))} KG</b></span>
              <span><small>ÚLTIMAS REPS</small><b>{strengthData.at(-1)?.reps || 0}</b></span>
            </div>
            <HistoryLineChart series={[{label:'CARGA',points:strengthData.map(d=>({date:d.date,value:d.load}))}]} emptyText="Aún no hay datos de carga."/>
            <div className="volume-caption">VOLUMEN POR SESIÓN · KG × REPETICIONES TOTALES</div>
            <HistoryLineChart series={[{label:'VOLUMEN',points:strengthData.map(d=>({date:d.date,value:d.volume}))}]} emptyText="Aún no hay datos de volumen."/>
          </> : <div className="history-empty">No hay sesiones registradas para este ejercicio.</div>}
        </> : <div className="history-empty">Vuelca entrenamientos de fuerza para empezar a ver progresión.</div>}
      </section>


      <section className="entry-card history-card data-export-card">
        <div className="history-card-head">
          <div><span>EXPORTAR DATOS</span><strong>CSV PARA ANÁLISIS EXTERNO</strong></div>
        </div>
        <p className="data-export-note">Siempre exporta el histórico completo, independientemente del rango visible.</p>
        <div className="data-export-list">
          <div className="data-export-item"><div><b>DIARIO COMPLETO</b><small>Una fila por fecha con peso, estado, alcohol, entrenamiento y notas.</small></div><button onClick={exportDailyCsv}>EXPORTAR CSV</button></div>
          <div className="data-export-item"><div><b>PESO</b><small>Fecha y peso registrado, listo para estudiar la evolución corporal.</small></div><button onClick={exportWeightCsv}>EXPORTAR CSV</button></div>
          <div className="data-export-item"><div><b>ESTADO DEL DÍA</b><small>Energía, ánimo, sueño y notas en cada fecha registrada.</small></div><button onClick={exportWellnessCsv}>EXPORTAR CSV</button></div>
          <div className="data-export-item"><div><b>HÁBITOS</b><small>Alcohol, categorías y cantidades registradas, junto con el indicador de entreno.</small></div><button onClick={exportHabitsCsv}>EXPORTAR CSV</button></div>
          <div className="data-export-item"><div><b>ENTRENAMIENTOS</b><small>Una fila por serie con ejercicio, carga, repeticiones y volumen calculado.</small></div><button onClick={exportTrainingCsv}>EXPORTAR CSV</button></div>
        </div>
      </section>

      {exportNotice&&<div className="settings-notice">{exportNotice}</div>}
      <button className="secondary-button" onClick={onBack}>VOLVER AL CALENDARIO</button>
      <footer>LOS DATOS NO JUZGAN. ENSEÑAN EL PATRÓN.</footer>
    </section>
  </main>
}

function StrengthLogScreen({date,onBack,onDumped}:{date:string,onBack:()=>void,onDumped:()=>void}) {
  const favoriteExercises=useMemo(()=>loadAppSettings().favoriteExercises,[])
  const [exercises,setExercises] = useState<TrainingExercise[]>([createStrengthExercise()])
  const [savedDraft,setSavedDraft] = useState(false)
  const [dumped,setDumped] = useState(false)
  const swipeStart = useRef<{x:number,y:number}|null>(null)
  const draftKey = `yoses-strength-draft-${date}`

  useEffect(() => {
    const raw = localStorage.getItem(draftKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) setExercises(parsed)
    } catch {}
  }, [draftKey])

  useEffect(() => {
    localStorage.setItem(draftKey,JSON.stringify(exercises))
    void syncNativeWidgets()
    setSavedDraft(true)
    const timer=window.setTimeout(()=>setSavedDraft(false),700)
    return ()=>window.clearTimeout(timer)
  }, [draftKey,exercises])

  function updateExercise(index:number,patch:Partial<TrainingExercise>) {
    setExercises(current=>current.map((item,i)=>i===index?{...item,...patch}:item))
  }

  function changeGroup(index:number,muscleGroup:string) {
    const nextName=STRENGTH_EXERCISES[muscleGroup]?.[0] || 'Otro'
    updateExercise(index,{muscleGroup,name:nextName})
  }

  function addSet(exerciseIndex:number) {
    setExercises(current=>current.map((exercise,i)=>i===exerciseIndex?{...exercise,sets:[...exercise.sets,{reps:exercise.sets.at(-1)?.reps ?? 5}]}:exercise))
  }

  function updateSet(exerciseIndex:number,setIndex:number,reps:number | undefined) {
    setExercises(current=>current.map((exercise,i)=>{
      if(i!==exerciseIndex)return exercise
      return {...exercise,sets:exercise.sets.map((set,j)=>j===setIndex?{...set,reps}:set)}
    }))
  }

  function removeSet(exerciseIndex:number,setIndex:number) {
    setExercises(current=>current.map((exercise,i)=>{
      if(i!==exerciseIndex)return exercise
      const sets=exercise.sets.filter((_,j)=>j!==setIndex)
      return {...exercise,sets:sets.length?sets:[{}]}
    }))
  }

  async function dumpToDailyEntry() {
    const valid = exercises
      .filter(exercise=>exercise.name.trim() && exercise.sets.length)
      .map(exercise=>({...exercise,name:exercise.name.trim(),loadKg:Number(exercise.loadKg)||0,sets:exercise.sets.map(set=>({reps:Math.max(0,Number(set.reps)||0)}))}))
    if (!valid.length) return

    const current = await getEntry(date)
    const entry: DailyEntry = current ? {
      ...current,
      trained:true,
      trainingType:'Fuerza',
      exercises:valid,
      updatedAt:new Date().toISOString()
    } : {
      date,
      alcohol:null,
      trained:true,
      trainingType:'Fuerza',
      exercises:valid,
      updatedAt:new Date().toISOString()
    }
    await saveEntry(entry)
    setDumped(true)
    window.setTimeout(()=>setDumped(false),1600)
    onDumped()
  }

  const totalSets=exercises.reduce((sum,e)=>sum+e.sets.length,0)

  return <main className="app-shell">
    <section
      className="phone-surface strength-screen"
      onTouchStart={(e:any)=>{const t=e.changedTouches[0];swipeStart.current={x:t.clientX,y:t.clientY}}}
      onTouchEnd={(e:any)=>{const start=swipeStart.current;if(!start)return;const t=e.changedTouches[0];const dx=t.clientX-start.x;const dy=t.clientY-start.y;if(dx<-70&&Math.abs(dx)>Math.abs(dy)*1.25)onBack();swipeStart.current=null}}
    >
      <div className="header-nebula strength-nebula" style={{backgroundImage:`url(${ritualNebula})`}} aria-hidden="true" />
      <header className="topbar detail-topbar strength-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Volver al calendario"><BackIcon/></button>
        <div className="brand mini detail-brand"><span>YOSE'S</span><small>PROJECT</small></div>
        <div className="topbar-spacer" aria-hidden="true" />
      </header>

      <div className="detail-ritual-wrap strength-ritual-wrap"><RitualHeader compact/></div>

      <div className="detail-heading strength-heading">
        <div className="strength-heading-inline"><DumbbellIcon active/><h1>ENTRENAMIENTO</h1></div>
        <p>REGISTRO DE FUERZA · {date.split('-').reverse().join('/')}</p>
      </div>

      <section className="strength-summary">
        <span><b>{exercises.length}</b> EJERCICIOS</span>
        <span><b>{totalSets}</b> SERIES</span>
        <span className={savedDraft?'saved':''}>BORRADOR {savedDraft?'✓':''}</span>
      </section>

      <div className="strength-exercises">
        {exercises.map((exercise,index)=><section className="entry-card strength-exercise-card" key={index}>
          <div className="strength-card-head">
            <div><span>EJERCICIO {index+1}</span><strong>{exercise.name}</strong></div>
            {exercises.length>1&&<button onClick={()=>setExercises(current=>current.filter((_,i)=>i!==index))} aria-label="Eliminar ejercicio">×</button>}
          </div>

          <div className="strength-select-grid">
            <label><span>GRUPO MUSCULAR</span><select value={exercise.muscleGroup} onChange={(e:any)=>changeGroup(index,e.target.value)}>{Object.keys(STRENGTH_EXERCISES).map(group=><option key={group}>{group}</option>)}</select></label>
            <label><span>EJERCICIO</span><select value={exercise.name} onChange={(e:any)=>updateExercise(index,{name:e.target.value})}>{[...(STRENGTH_EXERCISES[exercise.muscleGroup]||['Otro'])].sort((a,b)=>Number(favoriteExercises.includes(b))-Number(favoriteExercises.includes(a))).map(name=><option key={name}>{favoriteExercises.includes(name)?'★ ':''}{name}</option>)}</select></label>
          </div>

          <label className="strength-load"><span>CARGA</span><div><input type="number" inputMode="decimal" min="0" step="0.5" placeholder="—" value={exercise.loadKg ?? ''} onChange={(e:any)=>updateExercise(index,{loadKg:e.target.value===''?undefined:Number(e.target.value)})}/><b>KG</b></div></label>

          <div className="strength-sets">
            <div className="strength-sets-head"><span>SERIES REALES</span><small>REP.</small></div>
            {exercise.sets.map((set,setIndex)=><div className="strength-set-row" key={setIndex}>
              <b>SERIE {setIndex+1}</b>
              <input type="number" inputMode="numeric" min="0" max="99" placeholder="—" value={set.reps ?? ''} onChange={(e:any)=>updateSet(index,setIndex,e.target.value===''?undefined:Number(e.target.value))}/>
              <button onClick={()=>removeSet(index,setIndex)} aria-label={`Eliminar serie ${setIndex+1}`}>×</button>
            </div>)}
            <button className="add-set-button" onClick={()=>addSet(index)}>+ AÑADIR SERIE</button>
          </div>
        </section>)}
      </div>

      <button className="add-strength-exercise" onClick={()=>setExercises(current=>[...current,createStrengthExercise()])}>+ AÑADIR EJERCICIO</button>

      <button className="primary-button dump-button" onClick={dumpToDailyEntry}>{dumped?'DATOS VOLCADOS ✓':'VOLCAR DATOS A FICHA'} <span>{dumped?'':'→'}</span></button>
      <p className="dump-help">Guarda este entrenamiento como FUERZA en la ficha de hoy. El borrador permanecerá disponible durante el día.</p>

      <button className="swipe-hint" onClick={onBack}>DESLIZA ← PARA VOLVER AL CALENDARIO</button>
      <footer>REGISTRA LO QUE HICISTE. NO LO QUE PLANEABAS.</footer>
    </section>
  </main>
}

function App() {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [screen,setScreen] = useState<'home'|'timer'|'strength'|'history'|'settings'>('home')
  const homeSwipeStart = useRef<{x:number,y:number} | null>(null)

  async function refresh() {
    setEntries(await getAllEntries())
    setLoading(false)
    void syncNativeWidgets()
  }

  useEffect(() => {
    void (async()=>{
      await recoverNativeStateIfNeeded()
      saveAppSettings(loadAppSettings())
      await refresh()
    })()
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const navigate = (url?: string) => {
      if (!url) return
      try {
        const parsed = new URL(url)
        const route = (parsed.hostname || parsed.pathname.replace(/^\//,'')).toLowerCase()
        setSelectedDate(null)
        if (route === 'today') {
          setScreen('home')
          setSelectedDate(localIsoDate(today))
        } else if (route === 'history' || route === 'week') {
          setScreen('history')
        } else if (route === 'strength') {
          setScreen('strength')
        } else if (route === 'timer') {
          if (parsed.searchParams.get('start') === '1') sessionStorage.setItem('yoses-timer-autostart','1')
          setScreen('timer')
        } else {
          setScreen('home')
        }
      } catch {}
    }

    let removeListener: (() => Promise<void>) | undefined
    void CapacitorApp.getLaunchUrl().then(result => navigate(result?.url))
    void CapacitorApp.addListener('appUrlOpen', event => navigate(event.url)).then(handle => {
      removeListener = () => handle.remove()
    })

    return () => { if (removeListener) void removeListener() }
  }, [today])

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

  if (screen === 'timer') {
    return <IntervalTimerScreen onBack={()=>setScreen('home')} />
  }

  if (screen === 'strength') {
    return <StrengthLogScreen date={localIsoDate(today)} onBack={()=>setScreen('home')} onDumped={()=>void refresh()} />
  }

  if (screen === 'history') {
    return <HistoryScreen entries={entries} onBack={()=>setScreen('home')} />
  }

  if (screen === 'settings') {
    return <SettingsScreen entries={entries} onBack={()=>setScreen('home')} onDataChanged={refresh} />
  }

  const year = cursor.getFullYear(); const month = cursor.getMonth()
  const total = daysInMonth(year, month)
  const offset = mondayIndex(new Date(year, month, 1).getDay())
  const cells: Array<number|null> = [...Array(offset).fill(null), ...Array.from({length:total},(_,i)=>i+1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const shiftMonth = (delta:number) => setCursor(new Date(year, month + delta, 1))

  return <main className="app-shell">
    <section
      className="phone-surface home-screen"
      onTouchStart={(e:any)=>{const t=e.changedTouches[0];homeSwipeStart.current={x:t.clientX,y:t.clientY}}}
      onTouchEnd={(e:any)=>{const start=homeSwipeStart.current;if(!start)return;const t=e.changedTouches[0];const dx=t.clientX-start.x;const dy=t.clientY-start.y;if(dx<-70&&Math.abs(dx)>Math.abs(dy)*1.25)setScreen('timer');else if(dx>70&&Math.abs(dx)>Math.abs(dy)*1.25)setScreen('strength');homeSwipeStart.current=null}}
    >
      <div className="header-nebula" style={{backgroundImage:`url(${ritualNebula})`}} aria-hidden="true" />
      <header className="topbar">
        <div className="brand"><span>YOSE'S</span><small>PROJECT</small></div>
        <button className="icon-button" onClick={() => setScreen('settings')} aria-label="Ajustes"><GearIcon/></button>
      </header>

      <div className="home-hero-copy-row">
        <div className="hero-copy left">DISCIPLINA<br/>CONSTRUYE<br/><em>LIBERTAD</em></div>
        <div className="hero-copy right">MENTE<br/>MÁS CLARA<br/><em>CUERPO MÁS FUERTE</em></div>
      </div>
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
      <button className="secondary-button" onClick={()=>setScreen('history')}>DATA ANALYSIS</button>
      <div className="home-swipe-nav"><button className="swipe-hint" onClick={()=>setScreen('strength')}>DATOS DE ENTRENAMIENTO →</button><button className="swipe-hint" onClick={()=>setScreen('timer')}>← INTERVALÓMETRO</button></div>
      <footer>DISCIPLINA HOY. UN MAÑANA DIFERENTE.</footer>

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
  const [alcoholDetailOpen,setAlcoholDetailOpen] = useState(false)
  const [alcoholCategories,setAlcoholCategories] = useState<AlcoholCategory[]>([])
  const [alcoholAmounts,setAlcoholAmounts] = useState<Partial<Record<AlcoholCategory, number>>>({})
  const [alcoholNotes,setAlcoholNotes] = useState('')
  const [trained,setTrained] = useState(false)
  const [trainingMinutes,setTrainingMinutes] = useState<number | undefined>()
  const [trainingType,setTrainingType] = useState('Fuerza')
  const [exercises,setExercises] = useState<TrainingExercise[]>([{muscleGroup:'Otro',name:'',sets:[]}])
  const [energy,setEnergy] = useState<number | undefined>()
  const [mood,setMood] = useState<number | undefined>()
  const [sleep,setSleep] = useState<number | undefined>()
  const [weightKg,setWeightKg] = useState<number | undefined>()
  const [notes,setNotes] = useState('')
  const [saved,setSaved] = useState(false)
  const [hasExistingRecord,setHasExistingRecord] = useState(false)

  useEffect(() => {
    void getEntry(date).then(e => {
      setHasExistingRecord(Boolean(e))
      if (!e) return
      setAlcohol(e.alcohol); setAlcoholCategories(e.alcoholCategories || []); setAlcoholAmounts(e.alcoholAmounts || {}); setAlcoholNotes(e.alcoholNotes || ''); setAlcoholDetailOpen(e.alcohol === 'alcohol'); setTrained(e.trained); setTrainingMinutes(e.trainingMinutes); setTrainingType(e.trainingType || 'Fuerza'); setExercises(e.exercises?.length ? e.exercises.map(item => ({...item,muscleGroup:item.muscleGroup || 'Otro',sets:Array.isArray(item.sets)?item.sets:[]})) : [{muscleGroup:'Otro',name:'',sets:[]}])
      setEnergy(e.energy); setMood(e.mood); setSleep(e.sleep); setWeightKg(e.weightKg); setNotes(e.notes || '')
    })
  }, [date])

  function toggleAlcoholCategory(category: AlcoholCategory) {
    setAlcoholCategories(current => {
      if (current.includes(category)) {
        setAlcoholAmounts(amounts => {
          const next = { ...amounts }
          delete next[category]
          return next
        })
        return current.filter(item => item !== category)
      }
      return [...current, category]
    })
  }

  async function handleSave() {
    const cleanExercises: TrainingExercise[] = exercises.filter(exercise => exercise.name.trim()).map(exercise => ({...exercise,name:exercise.name.trim(),sets:Array.isArray(exercise.sets)?exercise.sets:[]}))
    const entry: DailyEntry = { date, alcohol, alcoholCategories: alcohol === 'alcohol' ? alcoholCategories : undefined, alcoholAmounts: alcohol === 'alcohol' ? alcoholAmounts : undefined, alcoholNotes: alcohol === 'alcohol' && alcoholNotes.trim() ? alcoholNotes.trim() : undefined, trained, trainingMinutes: trained ? trainingMinutes : undefined, trainingType: trained ? trainingType : undefined, exercises: trained && cleanExercises.length ? cleanExercises : undefined, energy, mood, sleep, weightKg, notes: notes.trim() || undefined, updatedAt: new Date().toISOString() }
    await saveEntry(entry)
    setHasExistingRecord(true)
    setSaved(true)
    window.setTimeout(()=>setSaved(false),1500)
  }

  async function handleDelete() {
    if (!hasExistingRecord) return
    const confirmed = window.confirm('¿Eliminar el registro de este día? Esta acción no se puede deshacer.')
    if (!confirmed) return
    await deleteEntry(date)
    onBack()
  }

  return <main className="app-shell">
    <section className="phone-surface day-screen">
      <div className="header-nebula compact" style={{backgroundImage:`url(${ritualNebula})`}} aria-hidden="true" />
      <header className="topbar detail-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Volver"><BackIcon/></button>
        <div className="brand mini detail-brand"><span>YOSE'S</span><small>PROJECT</small></div>
        <button className="icon-button trash-icon-button" onClick={handleDelete} disabled={!hasExistingRecord} aria-label="Eliminar registro"><TrashIcon/></button>
      </header>

      <div className="detail-ritual-wrap">
        <RitualHeader compact/>
      </div>

      <div className="detail-heading">
        <h1>{ES_DAYS_LONG[parsed.getDay()]} / {parsed.getDate()} {ES_MONTHS[parsed.getMonth()]}</h1>
        <p>REGISTRA EL DÍA. CONSTRUYE EL PATRÓN.</p>
      </div>

      <section className="entry-card">
        <div className="section-title"><BottleIcon/><span>ALCOHOL</span></div>
        <div className="choice-grid">
          <button className={`choice ${alcohol==='none'?'selected':''}`} onClick={()=>{setAlcohol('none');setAlcoholDetailOpen(false)}}><BottleIcon active/><span>SIN ALCOHOL</span></button>
          <button className={`choice ${alcohol==='alcohol'?'danger-selected':''}`} onClick={()=>{setAlcohol('alcohol');setAlcoholDetailOpen(true)}}><CanIcon active/><span>HE BEBIDO</span></button>
        </div>

        {alcohol === 'alcohol' && <div className="alcohol-detail">
          <button className="alcohol-detail-toggle" onClick={()=>setAlcoholDetailOpen(v=>!v)} aria-expanded={alcoholDetailOpen}>
            <span>DETALLE DE CONSUMO</span>
            <b className={alcoholDetailOpen ? 'open' : ''}>⌄</b>
          </button>

          {alcoholDetailOpen && <div className="alcohol-category-list">
            {([
              ['beer','CERVEZA'],
              ['wine','VINO'],
              ['spirits','LICORES']
            ] as Array<[AlcoholCategory,string]>).map(([category,label]) => {
              const selected = alcoholCategories.includes(category)
              return <div className={`alcohol-category-row ${selected ? 'selected' : ''}`} key={category}>
                <button className="alcohol-category-choice" onClick={()=>toggleAlcoholCategory(category)}>
                  <i aria-hidden="true">{selected ? '✓' : ''}</i>
                  <span>{label}</span>
                </button>
                {selected && <label className="alcohol-amount">
                  <span>Nº APROX.</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="99"
                    step="1"
                    placeholder="—"
                    value={alcoholAmounts[category] ?? ''}
                    onChange={(e:any)=>setAlcoholAmounts(current => ({...current,[category]:e.target.value === '' ? undefined : Number(e.target.value)}))}
                    aria-label={`Cantidad aproximada de ${label.toLowerCase()}`}
                  />
                </label>}
              </div>
            })}

            <label className="alcohol-context">
              <span>CONTEXTO DEL CONSUMO</span>
              <textarea
                value={alcoholNotes}
                onChange={(e:any)=>setAlcoholNotes(e.target.value)}
                placeholder="Ej.: cumpleaños de X, cena fuera, evento social, celebración…"
                rows={3}
              />
            </label>
          </div>}
        </div>}

        <p className="microcopy">{alcohol===null?'Sin registrar': alcohol==='none'?'Día marcado sin consumo de alcohol.':'Día marcado con consumo de alcohol.'}</p>
      </section>

      <section className="entry-card">
        <div className="section-title"><DumbbellIcon/><span>ENTRENAMIENTO</span></div>
        <button className={`training-toggle ${trained?'on':''}`} onClick={()=>setTrained(v=>!v)}><DumbbellIcon active/><span>{trained?'HE ENTRENADO HOY':'SIN ENTRENAMIENTO'}</span><b>{trained?'✓':'+'}</b></button>
        {trained && <div className="training-fields">
          <label>TIPO<select value={trainingType} onChange={(e:any)=>setTrainingType(e.target.value)}><option>Fuerza</option><option>Boxeo</option><option>Cardio</option><option>Movilidad</option><option>Otro</option></select></label>
          <label>DURACIÓN (MIN)<input type="number" min="1" max="600" placeholder="min" value={trainingMinutes ?? ''} onChange={(e:any)=>setTrainingMinutes(e.target.value ? Number(e.target.value) : undefined)}/></label>

          <div className="exercise-list">
            <div className="exercise-list-heading">
              <strong>EJERCICIOS</strong>
            </div>

            {exercises.map((exercise,index) => {
              const hasLoad = exercise.loadKg !== undefined && exercise.loadKg !== null
              const visibleSets = Array.isArray(exercise.sets) ? exercise.sets.filter(set => set.reps !== undefined && set.reps !== null) : []
              return <div className="exercise-record" key={index}>
                <div className="exercise-row">
                  <label>
                    <span>EJERCICIO {index + 1}{exercise.muscleGroup && exercise.muscleGroup !== 'Otro' ? ` · ${exercise.muscleGroup.toUpperCase()}` : ''}</span>
                    <input
                      type="text"
                      placeholder="Nombre del ejercicio"
                      value={exercise.name}
                      onChange={(e:any)=>setExercises(current => current.map((item,i)=>i===index ? {...item,name:e.target.value} : item))}
                    />
                  </label>
                  {exercises.length > 1 && <button
                    className="remove-exercise"
                    onClick={()=>setExercises(current => current.filter((_,i)=>i!==index))}
                    aria-label={`Eliminar ejercicio ${index + 1}`}
                  >×</button>}
                </div>

                {(hasLoad || visibleSets.length > 0) && <div className="exercise-performance">
                  {hasLoad && <div className="performance-chip load-chip">
                    <small>CARGA</small>
                    <b>{exercise.loadKg}</b>
                    <em>KG</em>
                  </div>}
                  {visibleSets.map((set,setIndex)=><div className="performance-chip" key={setIndex}>
                    <small>S{setIndex + 1}</small>
                    <b>{set.reps}</b>
                    <em>REP</em>
                  </div>)}
                </div>}
              </div>
            })}

            <button className="add-exercise-button" onClick={()=>setExercises(current => [...current,{muscleGroup:'Otro',name:'',sets:[]}])}>
              <span>+</span> AÑADIR EJERCICIO
            </button>
          </div>
        </div>}
      </section>

      <section className="entry-card">
        <div className="section-title"><span className="sigil">✦</span><span>ESTADO DEL DÍA</span></div>
        <Rating label="ENERGÍA" value={energy} onChange={setEnergy}/>
        <Rating label="ÁNIMO" value={mood} onChange={setMood}/>
        <Rating label="SUEÑO" value={sleep} onChange={setSleep}/>
      </section>

      <section className="entry-card weight-card">
        <div className="section-title"><WeightIcon/><span>PESO</span></div>
        <label className="weight-input-wrap">
          <input
            type="number"
            inputMode="decimal"
            min="20"
            max="400"
            step="0.1"
            placeholder="—"
            value={weightKg ?? ''}
            onChange={(e:any)=>setWeightKg(e.target.value === '' ? undefined : Number(e.target.value))}
            aria-label="Peso corporal en kilogramos"
          />
          <span>KG</span>
        </label>
        <p className="microcopy">Peso corporal registrado para este día.</p>
      </section>

      <section className="entry-card notes-card">
        <div className="section-title"><span className="sigil">⌁</span><span>NOTAS</span></div>
        <textarea value={notes} onChange={(e:any)=>setNotes(e.target.value)} placeholder="Cómo ha ido el día, sensaciones, contexto del entrenamiento…" rows={4}/>
      </section>

      <button className="primary-button" onClick={handleSave}>{saved?'GUARDADO ✓':'GUARDAR REGISTRO'} <span>{saved?'':'→'}</span></button>
      <button className="trash-button" onClick={handleDelete} disabled={!hasExistingRecord}><TrashIcon/><span>PAPELERA</span></button>
      <button className="secondary-button" onClick={onBack}>VOLVER AL CALENDARIO</button>
      <footer>DISCIPLINA HOY. UN MAÑANA DIFERENTE.</footer>
    </section>
  </main>
}

export default App
