import { readFileSync, writeFileSync } from 'node:fs'

const appPath = new URL('../src/App.tsx', import.meta.url)
const typesPath = new URL('../src/types.ts', import.meta.url)
const stylesPath = new URL('../src/styles.css', import.meta.url)

function replaceExact(source, before, after, label) {
  if (source.includes(after)) return source
  if (!source.includes(before)) throw new Error(`No se encontró el ancla para ${label}`)
  return source.replace(before, after)
}

function replaceBetween(source, start, end, replacement, label) {
  if (source.includes(replacement)) return source
  const startIndex = source.indexOf(start)
  if (startIndex < 0) throw new Error(`No se encontró el inicio para ${label}`)
  const endIndex = source.indexOf(end, startIndex)
  if (endIndex < 0) throw new Error(`No se encontró el final para ${label}`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

let types = readFileSync(typesPath, 'utf8')
types = replaceExact(
  types,
`export interface TrainingExercise {
  muscleGroup: string
  name: string
  loadKg?: number
  sets: TrainingSet[]
}`,
`export interface TrainingExercise {
  exerciseId?: string
  muscleGroup: string
  name: string
  loadKg?: number
  rir?: number
  sets: TrainingSet[]
}`,
  'TrainingExercise'
)
writeFileSync(typesPath, types)

let app = readFileSync(appPath, 'utf8')
app = replaceExact(
  app,
`import type { AlcoholCategory, AlcoholStatus, DailyEntry, TrainingExercise } from './types'`,
`import type { AlcoholCategory, AlcoholStatus, DailyEntry, TrainingExercise } from './types'
import { STRENGTH_EXERCISES, canonicalExerciseName, exerciseIdForName, normalizeDailyEntry, normalizeTrainingExercise } from './exerciseCatalog'`,
  'import del catálogo de ejercicios'
)

app = replaceExact(
  app,
`const STRENGTH_EXERCISES: Record<string,string[]> = {
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
}`,
`function createStrengthExercise(): TrainingExercise {
  const muscleGroup='Pierna / Glúteo'
  const name=STRENGTH_EXERCISES[muscleGroup][0]
  return { exerciseId:exerciseIdForName(name,muscleGroup), muscleGroup, name, sets:[{}] }
}`,
  'catálogo antiguo y ejercicio inicial'
)

app = replaceExact(
  app,
`function loadAppSettings(): AppSettings {
  try {
    const raw=localStorage.getItem('yoses-settings')
    return raw ? {...DEFAULT_SETTINGS,...JSON.parse(raw)} : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}`,
`function loadAppSettings(): AppSettings {
  try {
    const raw=localStorage.getItem('yoses-settings')
    const parsed=raw ? JSON.parse(raw) : {}
    const merged={...DEFAULT_SETTINGS,...parsed}
    const favorites=Array.isArray(merged.favoriteExercises) ? (merged.favoriteExercises as string[]).map(name=>canonicalExerciseName(name)) : []
    return {...merged,favoriteExercises:Array.from(new Set(favorites))}
  } catch {
    return DEFAULT_SETTINGS
  }
}`,
  'normalización de favoritos'
)

const historyBlock = `  const exerciseOptions=useMemo(()=>{
    const options=new Map<string,string>()
    sorted.forEach(entry=>(entry.exercises||[]).forEach(rawExercise=>{
      if(!rawExercise.name) return
      const exercise=normalizeTrainingExercise(rawExercise)
      const id=exercise.exerciseId || \`name:\${exercise.name}\`
      if(!options.has(id)) options.set(id,exercise.name)
    }))
    return Array.from(options,([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name,'es'))
  },[sorted])
  useEffect(()=>{
    if(!strengthExercise && exerciseOptions.length) setStrengthExercise(exerciseOptions[0].id)
    else if(strengthExercise && !exerciseOptions.some(option=>option.id===strengthExercise)) setStrengthExercise(exerciseOptions[0]?.id||'')
  },[exerciseOptions,strengthExercise])

  const strengthData=sorted.flatMap(entry=>(entry.exercises||[])
    .map(normalizeTrainingExercise)
    .filter(ex=>(ex.exerciseId || \`name:\${ex.name}\`)===strengthExercise)
    .map(ex=>{
      const reps=(ex.sets||[]).reduce((sum,set)=>sum+(set.reps||0),0)
      const load=ex.loadKg||0
      return {date:entry.date,load,volume:load*reps,reps}
    }))

`
app = replaceBetween(app, '  const exerciseNames=useMemo', '  const latestWeight=', historyBlock, 'histórico por exerciseId')
app = replaceExact(app, `{exerciseNames.length ? <>`, `{exerciseOptions.length ? <>`, 'lista de ejercicios del histórico')
app = replaceExact(
  app,
`{exerciseNames.map(name=><option key={name}>{name}</option>)}`,
`{exerciseOptions.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}`,
  'selector del histórico'
)

const exportTraining = `  function exportTrainingCsv() {
    const rows:Array<Array<unknown>>=[]
    sorted.forEach(entry=>{
      const exercises=entry.exercises ?? []
      if(!entry.trained && exercises.length===0) return
      if(exercises.length===0) {
        rows.push([entry.date,entry.trainingType ?? '',entry.trainingMinutes ?? '','','','','','','','',''])
        return
      }
      exercises.map(normalizeTrainingExercise).forEach(exercise=>{
        const sets=exercise.sets?.length ? exercise.sets : [{}]
        sets.forEach((set,index)=>{
          const load=typeof exercise.loadKg==='number' ? exercise.loadKg : null
          const rir=typeof exercise.rir==='number' ? exercise.rir : null
          const reps=typeof set.reps==='number' ? set.reps : null
          rows.push([
            entry.date,
            entry.trainingType ?? '',
            entry.trainingMinutes ?? '',
            exercise.muscleGroup,
            exercise.exerciseId ?? '',
            exercise.name,
            load ?? '',
            rir ?? '',
            index+1,
            reps ?? '',
            load!==null && reps!==null ? load*reps : ''
          ])
        })
      })
    })
    void exportCsv(
      \`yoses-project-entrenamientos-\${localIsoDate(new Date())}.csv\`,
      ['fecha','tipo_entrenamiento','duracion_min','grupo_muscular','exercise_id','ejercicio','carga_kg','rir','numero_serie','repeticiones','volumen_serie'],
      rows
    )
  }
`
app = replaceBetween(app, '  function exportTrainingCsv() {', '\n\n  return <main className="app-shell">', exportTraining, 'exportación de entrenamiento')
app = replaceExact(
  app,
`<div className="data-export-item"><div><b>ENTRENAMIENTOS</b><small>Una fila por serie con ejercicio, carga, repeticiones y volumen calculado.</small></div><button onClick={exportTrainingCsv}>EXPORTAR CSV</button></div>`,
`<div className="data-export-item"><div><b>ENTRENAMIENTOS</b><small>Una fila por serie con ejercicio, carga, RIR, repeticiones y volumen calculado.</small></div><button onClick={exportTrainingCsv}>EXPORTAR CSV</button></div>`,
  'texto de exportación de entrenamientos'
)

app = replaceExact(app, `if (Array.isArray(parsed) && parsed.length) setExercises(parsed)`, `if (Array.isArray(parsed) && parsed.length) setExercises(parsed.map(normalizeTrainingExercise))`, 'normalización del borrador')
app = replaceExact(
  app,
`  function changeGroup(index:number,muscleGroup:string) {
    const nextName=STRENGTH_EXERCISES[muscleGroup]?.[0] || 'Otro'
    updateExercise(index,{muscleGroup,name:nextName})
  }`,
`  function changeGroup(index:number,muscleGroup:string) {
    const nextName=STRENGTH_EXERCISES[muscleGroup]?.[0] || 'Otro'
    updateExercise(index,{muscleGroup,name:nextName,exerciseId:exerciseIdForName(nextName,muscleGroup)})
  }`,
  'cambio de grupo muscular'
)
app = replaceExact(
  app,
`onChange={(e:any)=>updateExercise(index,{name:e.target.value})}`,
`onChange={(e:any)=>{const name=e.target.value;updateExercise(index,{name,exerciseId:exerciseIdForName(name,exercise.muscleGroup)})}}`,
  'selector de ejercicio con ID'
)

app = replaceExact(
  app,
`          <label className="strength-load"><span>CARGA</span><div><input type="number" inputMode="decimal" min="0" step="0.5" placeholder="—" value={exercise.loadKg ?? ''} onChange={(e:any)=>updateExercise(index,{loadKg:e.target.value===''?undefined:Number(e.target.value)})}/><b>KG</b></div></label>`,
`          <div className="strength-metrics">
            <label className="strength-load"><span>CARGA</span><div><input type="number" inputMode="decimal" min="0" step="0.5" placeholder="—" value={exercise.loadKg ?? ''} onChange={(e:any)=>updateExercise(index,{loadKg:e.target.value===''?undefined:Number(e.target.value)})}/><b>KG</b></div></label>
            <label className="strength-load rir-field"><span>RIR</span><div><input type="number" inputMode="numeric" min="0" max="10" step="1" placeholder="—" value={exercise.rir ?? ''} onChange={(e:any)=>updateExercise(index,{rir:e.target.value===''?undefined:Math.min(10,Math.max(0,Number(e.target.value)))})}/><b>RIR</b></div></label>
          </div>`,
  'carga y RIR del borrador'
)

app = replaceExact(
  app,
`      .map(exercise=>({...exercise,name:exercise.name.trim(),loadKg:Number(exercise.loadKg)||0,sets:exercise.sets.map(set=>({reps:Math.max(0,Number(set.reps)||0)}))}))`,
`      .map(exercise=>normalizeTrainingExercise({...exercise,name:exercise.name.trim(),loadKg:Number(exercise.loadKg)||0,rir:typeof exercise.rir==='number'?Math.min(10,Math.max(0,exercise.rir)):undefined,sets:exercise.sets.map(set=>({reps:Math.max(0,Number(set.reps)||0)}))}))`,
  'volcado normalizado del borrador'
)

app = replaceExact(app, `    setEntries(await getAllEntries())`, `    setEntries((await getAllEntries()).map(normalizeDailyEntry))`, 'normalización del histórico al cargar')
app = replaceExact(
  app,
`setExercises(e.exercises?.length ? e.exercises.map(item => ({...item,muscleGroup:item.muscleGroup || 'Otro',sets:Array.isArray(item.sets)?item.sets:[]})) : [{muscleGroup:'Otro',name:'',sets:[]}])`,
`setExercises(e.exercises?.length ? e.exercises.map(normalizeTrainingExercise) : [{muscleGroup:'Otro',name:'',sets:[]}])`,
  'normalización de ejercicios en ficha diaria'
)
app = replaceExact(
  app,
`    const cleanExercises: TrainingExercise[] = exercises.filter(exercise => exercise.name.trim()).map(exercise => ({...exercise,name:exercise.name.trim(),sets:Array.isArray(exercise.sets)?exercise.sets:[]}))`,
`    const cleanExercises: TrainingExercise[] = exercises.filter(exercise => exercise.name.trim()).map(exercise => normalizeTrainingExercise({...exercise,name:exercise.name.trim(),sets:Array.isArray(exercise.sets)?exercise.sets:[]}))`,
  'guardado normalizado desde ficha diaria'
)
app = replaceExact(
  app,
`              const hasLoad = exercise.loadKg !== undefined && exercise.loadKg !== null
              const visibleSets = Array.isArray(exercise.sets) ? exercise.sets.filter(set => set.reps !== undefined && set.reps !== null) : []`,
`              const hasLoad = exercise.loadKg !== undefined && exercise.loadKg !== null
              const hasRir = exercise.rir !== undefined && exercise.rir !== null
              const visibleSets = Array.isArray(exercise.sets) ? exercise.sets.filter(set => set.reps !== undefined && set.reps !== null) : []`,
  'detección de RIR en ficha diaria'
)
app = replaceExact(app, `{(hasLoad || visibleSets.length > 0) && <div className="exercise-performance">`, `{(hasLoad || hasRir || visibleSets.length > 0) && <div className="exercise-performance">`, 'visualización de rendimiento con RIR')
app = replaceExact(
  app,
`                  {hasLoad && <div className="performance-chip load-chip">
                    <small>CARGA</small>
                    <b>{exercise.loadKg}</b>
                    <em>KG</em>
                  </div>}
                  {visibleSets.map`,
`                  {hasLoad && <div className="performance-chip load-chip">
                    <small>CARGA</small>
                    <b>{exercise.loadKg}</b>
                    <em>KG</em>
                  </div>}
                  {hasRir && <div className="performance-chip rir-chip">
                    <small>RIR</small>
                    <b>{exercise.rir}</b>
                    <em>REPS EN RESERVA</em>
                  </div>}
                  {visibleSets.map`,
  'chip RIR en ficha diaria'
)

writeFileSync(appPath, app)

let styles = readFileSync(stylesPath, 'utf8')
const cssMarker = '/* training-rir-upgrade */'
if (!styles.includes(cssMarker)) {
  styles += `

${cssMarker}
.strength-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
.strength-metrics .strength-load{margin-top:0;min-width:0}
.strength-metrics .rir-field>div{border-color:rgba(207,255,26,.38);background:rgba(207,255,26,.04)}
.strength-metrics .rir-field>span{color:#b9c49d}
.performance-chip.rir-chip{width:72px;border-color:rgba(207,255,26,.38);background:rgba(207,255,26,.04)}
.performance-chip.rir-chip b{color:var(--acid)}
.performance-chip.rir-chip em{font-size:4px;letter-spacing:.55px;text-align:center}
@media(max-width:360px){
  .strength-metrics{grid-template-columns:1fr 1fr;gap:6px}
  .strength-load>div{grid-template-columns:1fr 40px}
}
`
}
writeFileSync(stylesPath, styles)

console.log('Training upgrade aplicado correctamente.')
