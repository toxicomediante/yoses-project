import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteEntry, getAllEntries, getEntry, saveEntry } from './storage'
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
  return { muscleGroup:'Pierna', name:'Sentadilla con barra', loadKg:0, sets:[{reps:5}] }
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
  }, [])

  useEffect(() => {
    localStorage.setItem('yoses-interval-timer', JSON.stringify({workSec,restSec,rounds,prepSec,soundEnabled,vibrationEnabled}))
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


function StrengthLogScreen({date,onBack,onDumped}:{date:string,onBack:()=>void,onDumped:()=>void}) {
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

  function updateSet(exerciseIndex:number,setIndex:number,reps:number) {
    setExercises(current=>current.map((exercise,i)=>{
      if(i!==exerciseIndex)return exercise
      return {...exercise,sets:exercise.sets.map((set,j)=>j===setIndex?{...set,reps}:set)}
    }))
  }

  function removeSet(exerciseIndex:number,setIndex:number) {
    setExercises(current=>current.map((exercise,i)=>{
      if(i!==exerciseIndex)return exercise
      const sets=exercise.sets.filter((_,j)=>j!==setIndex)
      return {...exercise,sets:sets.length?sets:[{reps:5}]}
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
            <label><span>EJERCICIO</span><select value={exercise.name} onChange={(e:any)=>updateExercise(index,{name:e.target.value})}>{(STRENGTH_EXERCISES[exercise.muscleGroup]||['Otro']).map(name=><option key={name}>{name}</option>)}</select></label>
          </div>

          <label className="strength-load"><span>CARGA</span><div><input type="number" inputMode="decimal" min="0" step="0.5" value={exercise.loadKg ?? ''} onChange={(e:any)=>updateExercise(index,{loadKg:e.target.value===''?0:Number(e.target.value)})}/><b>KG</b></div></label>

          <div className="strength-sets">
            <div className="strength-sets-head"><span>SERIES REALES</span><small>REP.</small></div>
            {exercise.sets.map((set,setIndex)=><div className="strength-set-row" key={setIndex}>
              <b>SERIE {setIndex+1}</b>
              <input type="number" inputMode="numeric" min="0" max="99" value={set.reps} onChange={(e:any)=>updateSet(index,setIndex,Number(e.target.value)||0)}/>
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
  const [showSettings, setShowSettings] = useState(false)
  const [screen,setScreen] = useState<'home'|'timer'|'strength'>('home')
  const homeSwipeStart = useRef<{x:number,y:number} | null>(null)

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

  if (screen === 'timer') {
    return <IntervalTimerScreen onBack={()=>setScreen('home')} />
  }

  if (screen === 'strength') {
    return <StrengthLogScreen date={localIsoDate(today)} onBack={()=>setScreen('home')} onDumped={()=>void refresh()} />
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
      <div className="home-swipe-nav"><button className="swipe-hint" onClick={()=>setScreen('strength')}>DATOS DE ENTRENAMIENTO →</button><button className="swipe-hint" onClick={()=>setScreen('timer')}>← INTERVALÓMETRO</button></div>
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
  const [alcoholDetailOpen,setAlcoholDetailOpen] = useState(false)
  const [alcoholCategories,setAlcoholCategories] = useState<AlcoholCategory[]>([])
  const [alcoholAmounts,setAlcoholAmounts] = useState<Partial<Record<AlcoholCategory, number>>>({})
  const [alcoholNotes,setAlcoholNotes] = useState('')
  const [trained,setTrained] = useState(false)
  const [trainingMinutes,setTrainingMinutes] = useState<number | undefined>()
  const [trainingType,setTrainingType] = useState('Fuerza')
  const [exercises,setExercises] = useState<string[]>([''])
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
      setAlcohol(e.alcohol); setAlcoholCategories(e.alcoholCategories || []); setAlcoholAmounts(e.alcoholAmounts || {}); setAlcoholNotes(e.alcoholNotes || ''); setAlcoholDetailOpen(e.alcohol === 'alcohol'); setTrained(e.trained); setTrainingMinutes(e.trainingMinutes); setTrainingType(e.trainingType || 'Fuerza'); setExercises(e.exercises?.length ? e.exercises.map(item => item.name) : [''])
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
    const cleanExercises: TrainingExercise[] = exercises.map(name => name.trim()).filter(Boolean).map(name => ({ muscleGroup:'Otro', name, loadKg:0, sets:[{reps:0}] }))
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
              <span>El detalle de series, repeticiones, peso y RPE se añadirá después.</span>
            </div>

            {exercises.map((exercise,index) => <div className="exercise-row" key={index}>
              <label>
                <span>EJERCICIO {index + 1}</span>
                <input
                  type="text"
                  placeholder="Nombre del ejercicio"
                  value={exercise}
                  onChange={(e:any)=>setExercises(current => current.map((item,i)=>i===index ? e.target.value : item))}
                />
              </label>
              {exercises.length > 1 && <button
                className="remove-exercise"
                onClick={()=>setExercises(current => current.filter((_,i)=>i!==index))}
                aria-label={`Eliminar ejercicio ${index + 1}`}
              >×</button>}
            </div>)}

            <button className="add-exercise-button" onClick={()=>setExercises(current => [...current,''])}>
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
