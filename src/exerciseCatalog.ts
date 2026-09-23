import type { DailyEntry, TrainingExercise } from './types'

interface ExerciseDefinition {
  id: string
  name: string
}

export const STRENGTH_EXERCISE_CATALOG: Record<string, ExerciseDefinition[]> = {
  'Pecho': [
    {id:'bench_press_flat_barbell',name:'Press banca plano con barra'},
    {id:'bench_press_incline_barbell',name:'Press banca inclinado con barra'},
    {id:'bench_press_decline_barbell',name:'Press banca declinado con barra'},
    {id:'dumbbell_press_flat',name:'Press plano con mancuernas'},
    {id:'dumbbell_press_incline',name:'Press inclinado con mancuernas'},
    {id:'dumbbell_press_decline',name:'Press declinado con mancuernas'},
    {id:'chest_press_machine',name:'Press de pecho en máquina'},
    {id:'chest_press_converging_machine',name:'Press de pecho convergente'},
    {id:'smith_bench_press_flat',name:'Press en multipower plano'},
    {id:'smith_bench_press_incline',name:'Press en multipower inclinado'},
    {id:'chest_dips',name:'Fondos enfocados a pecho'},
    {id:'dumbbell_fly',name:'Aperturas con mancuernas'},
    {id:'pec_deck',name:'Aperturas en máquina / Peck Deck'},
    {id:'cable_crossover',name:'Cruce de poleas'},
    {id:'cable_crossover_high_to_low',name:'Cruce de poleas alto-bajo'},
    {id:'cable_crossover_low_to_high',name:'Cruce de poleas bajo-alto'}
  ],
  'Espalda': [
    {id:'deadlift_conventional',name:'Peso muerto convencional'},
    {id:'barbell_row',name:'Remo con barra'},
    {id:'pendlay_row',name:'Remo Pendlay'},
    {id:'yates_row',name:'Remo Yates'},
    {id:'tbar_row',name:'Remo T-Bar'},
    {id:'one_arm_dumbbell_row',name:'Remo con mancuerna a una mano'},
    {id:'chest_supported_row',name:'Remo con pecho apoyado'},
    {id:'gironda_row',name:'Remo Gironda'},
    {id:'seated_cable_row_wide',name:'Remo sentado en polea agarre abierto'},
    {id:'seated_cable_row_neutral',name:'Remo sentado en polea agarre neutro'},
    {id:'machine_row_converging',name:'Remo en máquina convergente'},
    {id:'machine_row_unilateral',name:'Remo unilateral en máquina'},
    {id:'pullup_pronated',name:'Dominadas pronas'},
    {id:'chinup_supinated',name:'Dominadas supinas'},
    {id:'pullup_neutral',name:'Dominadas agarre neutro'},
    {id:'lat_pulldown_pronated',name:'Jalón al pecho pronado'},
    {id:'lat_pulldown_supinated',name:'Jalón al pecho supino'},
    {id:'lat_pulldown_neutral',name:'Jalón agarre neutro'},
    {id:'lat_pulldown_unilateral',name:'Jalón unilateral'},
    {id:'straight_arm_pulldown',name:'Pullover en polea / Jalón brazos rectos'}
  ],
  'Pierna / Glúteo': [
    {id:'back_squat_barbell',name:'Sentadilla trasera con barra'},
    {id:'front_squat',name:'Sentadilla frontal'},
    {id:'smith_squat',name:'Sentadilla en multipower'},
    {id:'hack_squat',name:'Hack squat'},
    {id:'goblet_squat',name:'Sentadilla goblet'},
    {id:'leg_press_45',name:'Prensa 45º'},
    {id:'leg_press_horizontal',name:'Prensa horizontal'},
    {id:'bulgarian_split_squat',name:'Sentadilla búlgara'},
    {id:'walking_lunge',name:'Zancadas caminando'},
    {id:'static_lunge',name:'Zancadas estáticas'},
    {id:'step_up',name:'Step-up'},
    {id:'leg_extension',name:'Extensión de cuádriceps'},
    {id:'romanian_deadlift',name:'Peso muerto rumano'},
    {id:'sumo_deadlift',name:'Peso muerto sumo'},
    {id:'barbell_hip_thrust',name:'Hip thrust con barra'},
    {id:'machine_hip_thrust',name:'Hip thrust en máquina'},
    {id:'leg_curl_lying',name:'Curl femoral tumbado'},
    {id:'leg_curl_seated',name:'Curl femoral sentado'},
    {id:'leg_curl_standing_unilateral',name:'Curl femoral de pie unilateral'},
    {id:'cable_glute_kickback',name:'Patada de glúteo en polea'},
    {id:'hip_abductor_machine',name:'Máquina de abductores'},
    {id:'hip_adductor_machine',name:'Máquina de aductores'},
    {id:'calf_raise_standing',name:'Elevación de gemelos de pie'},
    {id:'calf_raise_seated',name:'Elevación de gemelos sentado'},
    {id:'calf_raise_leg_press',name:'Gemelos en prensa'}
  ],
  'Hombro': [
    {id:'overhead_press_barbell',name:'Press militar con barra'},
    {id:'overhead_press_barbell_seated',name:'Press militar sentado con barra'},
    {id:'dumbbell_shoulder_press',name:'Press de hombro con mancuernas'},
    {id:'machine_shoulder_press',name:'Press de hombro en máquina'},
    {id:'arnold_press',name:'Press Arnold'},
    {id:'lateral_raise_dumbbell',name:'Elevaciones laterales con mancuernas'},
    {id:'lateral_raise_cable',name:'Elevaciones laterales en polea'},
    {id:'lateral_raise_machine',name:'Elevaciones laterales en máquina'},
    {id:'front_raise',name:'Elevaciones frontales'},
    {id:'rear_delt_fly_dumbbell',name:'Pájaros con mancuernas'},
    {id:'reverse_pec_deck',name:'Pájaros en máquina / Peck Deck inverso'},
    {id:'face_pull',name:'Face pull'}
  ],
  'Bíceps': [
    {id:'barbell_curl_straight',name:'Curl con barra recta'},
    {id:'ez_bar_curl',name:'Curl con barra Z'},
    {id:'alternating_dumbbell_curl',name:'Curl con mancuernas alterno'},
    {id:'hammer_curl',name:'Curl martillo'},
    {id:'ez_preacher_curl',name:'Curl predicador con barra Z'},
    {id:'machine_preacher_curl',name:'Curl predicador en máquina'},
    {id:'incline_dumbbell_curl',name:'Curl inclinado con mancuernas'},
    {id:'cable_curl_low',name:'Curl en polea baja'},
    {id:'bayesian_curl',name:'Curl bayesiano'},
    {id:'concentration_curl',name:'Curl concentrado'}
  ],
  'Tríceps': [
    {id:'close_grip_bench_press',name:'Press banca agarre cerrado'},
    {id:'triceps_dips',name:'Fondos enfocados a tríceps'},
    {id:'ez_skullcrusher',name:'Press francés con barra Z'},
    {id:'dumbbell_skullcrusher',name:'Press francés con mancuernas'},
    {id:'cable_pushdown_bar',name:'Extensión de tríceps en polea con barra'},
    {id:'cable_pushdown_rope',name:'Extensión de tríceps en polea con cuerda'},
    {id:'cable_pushdown_unilateral',name:'Extensión unilateral en polea'},
    {id:'overhead_rope_triceps_extension',name:'Extensión de tríceps sobre la cabeza con cuerda'},
    {id:'overhead_dumbbell_triceps_extension',name:'Extensión sobre la cabeza con mancuerna'}
  ],
  'Core': [
    {id:'plank',name:'Plancha'},
    {id:'side_plank',name:'Plancha lateral'},
    {id:'crunch',name:'Crunch'},
    {id:'cable_crunch',name:'Crunch en polea'},
    {id:'machine_crunch',name:'Crunch en máquina'},
    {id:'lying_leg_raise',name:'Elevación de piernas tumbado'},
    {id:'hanging_leg_raise',name:'Elevación de piernas colgado'},
    {id:'hanging_knee_raise',name:'Elevación de rodillas colgado'},
    {id:'ab_wheel',name:'Rueda abdominal'},
    {id:'pallof_press',name:'Pallof press'},
    {id:'cable_woodchop',name:'Rotación de tronco en polea'}
  ],
  'Trapecio': [
    {id:'barbell_shrug',name:'Encogimientos con barra'},
    {id:'dumbbell_shrug',name:'Encogimientos con mancuernas'},
    {id:'farmers_walk',name:"Farmer's walk"}
  ],
  'Antebrazo': [
    {id:'wrist_curl',name:'Curl de muñeca'},
    {id:'reverse_curl',name:'Curl inverso'},
    {id:'wrist_extension',name:'Extensión de muñeca'}
  ],
  'Otro': [
    {id:'other',name:'Otro'}
  ]
}

export const STRENGTH_EXERCISES: Record<string,string[]> = Object.fromEntries(
  Object.entries(STRENGTH_EXERCISE_CATALOG).map(([group,items])=>[group,items.map(item=>item.name)])
)

const DEFINITIONS = Object.entries(STRENGTH_EXERCISE_CATALOG).flatMap(([group,items])=>items.map(item=>({...item,group})))
const BY_NAME = new Map(DEFINITIONS.map(item=>[item.name,item]))
const BY_ID = new Map(DEFINITIONS.map(item=>[item.id,item]))

const LEGACY_BY_GROUP = new Map<string,string>([
  ['Pecho::Press de banca plano','Press banca plano con barra'],
  ['Pecho::Press inclinado','Press banca inclinado con barra'],
  ['Pecho::Press con mancuernas','Press plano con mancuernas'],
  ['Pecho::Fondos','Fondos enfocados a pecho'],
  ['Pecho::Aperturas','Aperturas con mancuernas'],
  ['Espalda::Remo con mancuerna','Remo con mancuerna a una mano'],
  ['Espalda::Dominadas','Dominadas pronas'],
  ['Espalda::Jalón al pecho','Jalón al pecho pronado'],
  ['Espalda::Peso muerto','Peso muerto convencional'],
  ['Espalda::Remo en máquina','Remo Gironda'],
  ['Pierna::Sentadilla con barra','Sentadilla trasera con barra'],
  ['Pierna::Prensa de piernas','Prensa 45º'],
  ['Pierna::Zancadas','Zancadas caminando'],
  ['Pierna::Curl femoral','Curl femoral tumbado'],
  ['Pierna::Elevación de gemelos','Elevación de gemelos de pie'],
  ['Hombro::Press militar','Press militar con barra'],
  ['Hombro::Press con mancuernas','Press de hombro con mancuernas'],
  ['Hombro::Elevaciones laterales','Elevaciones laterales con mancuernas'],
  ['Hombro::Pájaros','Pájaros con mancuernas'],
  ['Bíceps::Curl de bíceps','Curl con barra recta'],
  ['Bíceps::Curl predicador','Curl predicador con barra Z'],
  ['Tríceps::Press cerrado','Press banca agarre cerrado'],
  ['Tríceps::Extensión de tríceps','Extensión de tríceps en polea con barra'],
  ['Tríceps::Press francés','Press francés con barra Z'],
  ['Tríceps::Fondos de tríceps','Fondos enfocados a tríceps'],
  ['Core::Elevación de piernas','Elevación de piernas tumbado']
])

const LEGACY_GLOBAL = new Map<string,string>([
  ['Press de banca plano','Press banca plano con barra'],
  ['Sentadilla con barra','Sentadilla trasera con barra'],
  ['Press militar','Press militar con barra'],
  ['Remo en máquina','Remo Gironda']
])

function canonicalDefinition(name:string,muscleGroup?:string) {
  const trimmed=(name||'').trim()
  const grouped=LEGACY_BY_GROUP.get(`${muscleGroup||''}::${trimmed}`)
  const migratedName=grouped || LEGACY_GLOBAL.get(trimmed) || trimmed
  return BY_NAME.get(migratedName) || (migratedName===trimmed && muscleGroup ? BY_ID.get('other') : undefined)
}

export function canonicalExerciseName(name:string,muscleGroup?:string) {
  const trimmed=(name||'').trim()
  const grouped=LEGACY_BY_GROUP.get(`${muscleGroup||''}::${trimmed}`)
  return grouped || LEGACY_GLOBAL.get(trimmed) || trimmed
}

export function exerciseIdForName(name:string,muscleGroup?:string) {
  const canonicalName=canonicalExerciseName(name,muscleGroup)
  return BY_NAME.get(canonicalName)?.id
}

export function normalizeTrainingExercise(exercise:TrainingExercise):TrainingExercise {
  const originalName=(exercise.name||'').trim()
  const canonicalName=canonicalExerciseName(originalName,exercise.muscleGroup)
  const definition=BY_NAME.get(canonicalName) || (exercise.exerciseId ? BY_ID.get(exercise.exerciseId) : undefined)
  const legacyRirValue=typeof exercise.rir==='number' ? exercise.rir : Number(exercise.rir)
  const legacyRir=Number.isFinite(legacyRirValue) ? Math.min(10,Math.max(0,legacyRirValue)) : undefined
  const sets=Array.isArray(exercise.sets) ? exercise.sets.map(set=>{
    const setRirValue=typeof set.rir==='number' ? set.rir : Number(set.rir)
    return {
      ...set,
      rir:Number.isFinite(setRirValue) ? Math.min(10,Math.max(0,setRirValue)) : undefined
    }
  }) : []
  return {
    ...exercise,
    exerciseId: definition?.id || exercise.exerciseId,
    muscleGroup: definition?.group || exercise.muscleGroup || 'Otro',
    name: definition?.name || canonicalName,
    rir: legacyRir,
    sets
  }
}

export function normalizeDailyEntry(entry:DailyEntry):DailyEntry {
  if(!entry.exercises?.length) return entry
  return {...entry,exercises:entry.exercises.map(normalizeTrainingExercise)}
}
