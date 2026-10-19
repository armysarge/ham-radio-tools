import { shallowRef } from 'vue'
import type { Pack, PackKind, PackMeta } from '../lib/packs'

// Packs can be large (tens of thousands of rows), so they live in IndexedDB rather than localStorage.
const DB = 'hrt-packs', STORE = 'packs'

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('This browser does not allow local pack storage (IndexedDB is unavailable).'))
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' })
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error ?? new Error('Could not open local pack storage.'))
  })
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise<T>((res, rej) => {
    const t = db.transaction(STORE, mode)
    const q = fn(t.objectStore(STORE))
    t.oncomplete = () => { db.close(); res(q.result) }
    t.onerror = t.onabort = () => { db.close(); rej(t.error ?? new Error('Local pack storage failed.')) }
  })
}

type Stored = Pack & { rows: number; installed: string }
export const installedPacks = shallowRef<PackMeta[]>([])
export const packsError = shallowRef('')

export async function refreshPacks() {
  try {
    const all = await tx<Stored[]>('readonly', (s) => s.getAll())
    installedPacks.value = all.map(({ data: _d, ...meta }) => meta).sort((a, b) => a.title.localeCompare(b.title))
    packsError.value = ''
  } catch (e) { installedPacks.value = []; packsError.value = (e as Error).message }
}
export async function installPack(pack: Pack, rows: number) {
  // Vue wraps component state in Proxies, which IndexedDB cannot structured-clone; store a plain copy.
  const plain = JSON.parse(JSON.stringify(pack)) as Pack
  await tx('readwrite', (s) => s.put({ ...plain, rows, installed: new Date().toISOString() }))
  await refreshPacks()
}
export async function getPack<D = unknown>(id: string): Promise<Pack<D> | null> {
  return ((await tx<Stored | undefined>('readonly', (s) => s.get(id))) as Pack<D> | undefined) ?? null
}
export async function removePack(id: string) { await tx('readwrite', (s) => s.delete(id)); await refreshPacks() }
export const packsOfKind = (k: PackKind) => installedPacks.value.filter((p) => p.kind === k)
