import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

const createStorageMock = (): Storage => {
  let store: Record<string, string> = {}

  return {
    get length() {
      return Object.keys(store).length
    },
    clear: () => {
      store = {}
    },
    getItem: (key: string) => store[key] ?? null,
    key: (index: number) => Object.keys(store)[index] ?? null,
    removeItem: (key: string) => {
      delete store[key]
    },
    setItem: (key: string, value: string) => {
      store[key] = value
    },
  }
}

const ensureStorage = (name: 'localStorage' | 'sessionStorage') => {
  const storage = globalThis[name]
  if (
    storage &&
    typeof storage.clear === 'function' &&
    typeof storage.getItem === 'function'
  ) {
    return
  }

  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: createStorageMock(),
  })
}

ensureStorage('localStorage')
ensureStorage('sessionStorage')

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
})
