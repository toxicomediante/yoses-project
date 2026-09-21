import { Capacitor, registerPlugin } from '@capacitor/core'
import type { DailyEntry } from './types'

const DB_NAME = 'yoses-project'
const STORE_NAME = 'daily-entries'
const DB_VERSION = 1

interface RecoveryCandidate {
  snapshot: string
  source: string
}

interface YoseWidgetsNative {
  update(options: { snapshot: string; persist?: boolean }): Promise<{ updated: boolean; backupPath?: string }>
  saveFile(options: { filename: string; contents: string; mimeType: string }): Promise<{ path: string }>
  getRecoverySnapshots(): Promise<{ snapshots: RecoveryCandidate[] }>
  clearRecoverySnapshots(): Promise<void>
}

const YoseWidgets = registerPlugin<YoseWidgetsNative>('YoseWidgets')

export async function saveTextFile(filename:string, contents:string, mimeType:string):Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const result=await YoseWidgets.saveFile({filename,contents,mimeType})
    return result.path
  }

  const blob=new Blob([contents],{type:mimeType})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url
  a.download=filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
  return `Descargas del navegador/${filename}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'date' })
      }
    }
  })
}

export function isValidDailyEntry(entry:unknown):entry is DailyEntry {
  if (!entry || typeof entry !== 'object') return false
  const item=entry as Record<string,unknown>
  if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return false
  if (item.alcohol !== null && item.alcohol !== 'none' && item.alcohol !== 'alcohol') return false
  if (typeof item.trained !== 'boolean') return false
  if (typeof item.updatedAt !== 'string') return false
  return true
}

export async function getAllEntries(): Promise<DailyEntry[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result as DailyEntry[])
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function getEntry(date: string): Promise<DailyEntry | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(date)
    request.onsuccess = () => resolve(request.result as DailyEntry | undefined)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

async function replaceAllEntriesRaw(entries:DailyEntry[]):Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,'readwrite')
    const store=tx.objectStore(STORE_NAME)
    store.clear()
    entries.forEach(entry=>store.put(entry))
    tx.oncomplete=()=>{db.close();resolve()}
    tx.onerror=()=>{db.close();reject(tx.error)}
    tx.onabort=()=>{db.close();reject(tx.error || new Error('La transacción de datos fue cancelada.'))}
  })
}

export async function replaceAllEntries(entries:DailyEntry[]):Promise<void> {
  if(!entries.every(isValidDailyEntry)) throw new Error('El backup contiene registros no válidos.')
  await replaceAllEntriesRaw(entries)
  await syncNativeWidgets()
}

export async function saveEntry(entry: DailyEntry): Promise<void> {
  if(!isValidDailyEntry(entry)) throw new Error('Registro diario no válido.')
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(entry)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
  void syncNativeWidgets()
}

export async function deleteEntry(date: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(date)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
  void syncNativeWidgets()
}

export async function clearAllEntries(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
  if (Capacitor.isNativePlatform()) {
    try { await YoseWidgets.clearRecoverySnapshots() } catch {}
    await syncNativeWidgets({persist:false})
  }
}

function widgetDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function readLocalJson(key: string, fallback: unknown) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
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

function restoreLocalState(payload:Record<string,unknown>) {
  if(payload.settings && typeof payload.settings==='object') {
    localStorage.setItem('yoses-settings',JSON.stringify(payload.settings))
  }
  const timer=payload.intervalTimer ?? payload.timer
  if(timer && typeof timer==='object') {
    localStorage.setItem('yoses-interval-timer',JSON.stringify(timer))
  }
  if(payload.strengthDrafts && typeof payload.strengthDrafts==='object') {
    Object.entries(payload.strengthDrafts as Record<string,unknown>).forEach(([key,value])=>{
      if(key.startsWith('yoses-strength-draft-')) localStorage.setItem(key,JSON.stringify(value))
    })
  }
}

export async function recoverNativeStateIfNeeded():Promise<boolean> {
  if(!Capacitor.isNativePlatform()) return false
  const current=await getAllEntries()
  if(current.length>0) return false

  try {
    const result=await YoseWidgets.getRecoverySnapshots()
    for(const candidate of result.snapshots || []) {
      try {
        const payload=JSON.parse(candidate.snapshot) as Record<string,unknown>
        if(payload.app && payload.app!=="YOSE'S PROJECT") continue
        if(!Array.isArray(payload.entries) || payload.entries.length===0) continue
        if(!payload.entries.every(isValidDailyEntry)) continue
        restoreLocalState(payload)
        await replaceAllEntriesRaw(payload.entries as DailyEntry[])
        await syncNativeWidgets()
        console.info(`Datos recuperados desde ${candidate.source}.`)
        return true
      } catch {}
    }
  } catch (error) {
    console.warn('No se pudo consultar la copia nativa de recuperación.',error)
  }
  return false
}

export async function syncNativeWidgets(options:{persist?:boolean}={}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const today = widgetDateKey()
    const intervalTimer=readLocalJson('yoses-interval-timer', {})
    const strengthDrafts=collectStrengthDrafts()
    const snapshot = {
      app:"YOSE'S PROJECT",
      version:2,
      exportedAt:new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: await getAllEntries(),
      settings: readLocalJson('yoses-settings', {}),
      intervalTimer,
      strengthDrafts,
      timer: intervalTimer,
      strengthDraft: strengthDrafts[`yoses-strength-draft-${today}`] ?? []
    }
    await YoseWidgets.update({ snapshot: JSON.stringify(snapshot), persist: options.persist !== false })
  } catch (error) {
    console.warn('No se pudieron actualizar los widgets o la copia nativa.', error)
  }
}
