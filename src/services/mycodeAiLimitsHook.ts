import { useEffect, useState } from 'react'
import {
  type MyCodeAILimits,
  currentLimits,
  statusListeners,
} from './mycodeAiLimits.js'

export function useMyCodeAiLimits(): MyCodeAILimits {
  const [limits, setLimits] = useState<MyCodeAILimits>({ ...currentLimits })

  useEffect(() => {
    const listener = (newLimits: MyCodeAILimits) => {
      setLimits({ ...newLimits })
    }
    statusListeners.add(listener)

    return () => {
      statusListeners.delete(listener)
    }
  }, [])

  return limits
}
