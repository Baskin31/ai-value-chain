import { useState, useCallback } from 'react'

const STORAGE_KEY = 'anthropic-api-key'

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? ''
  )

  const setApiKey = useCallback((key: string) => {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim())
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setApiKeyState(key.trim())
  }, [])

  return { apiKey, setApiKey }
}
