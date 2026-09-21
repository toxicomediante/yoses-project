import { Capacitor, registerPlugin } from '@capacitor/core'
import type { DailyEntry } from './types'

const DB_NAME = 'yoses-project'
const STORE_NAME = 'daily-entries'
const DB_VERSION = 1

interface YoseWidgetsNative {
  update(options: { snapshot: string }): Promise<void>
  saveFile(options: { filename: string; contents: string; mimeType: string }): Promise<{ path: string }>
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

export async function saveEntry(entry: DailyEntry): Promise<void> {
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
  void syncNativeWidgets()
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

export async function syncNativeWidgets(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const today = widgetDateKey()
    const snapshot = {
      updatedAt: new Date().toISOString(),
      entries: await getAllEntries(),
      settings: readLocalJson('yoses-settings', {}),
      timer: readLocalJson('yoses-interval-timer', {}),
      strengthDraft: readLocalJson(`yoses-strength-draft-${today}`, [])
    }
    await YoseWidgets.update({ snapshot: JSON.stringify(snapshot) })
  } catch (error) {
    console.warn('No se pudieron actualizar los widgets nativos.', error)
  }
}
