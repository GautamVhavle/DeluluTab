import { useCallback, useEffect, useState } from 'react'
import { loadIntegration, saveIntegration, subscribeIntegrations, type IntegrationValues } from '@/services/integrations'

/** One widget's locally stored values. Ready is false until the first read resolves. */
export function useIntegration(widgetId: string) {
  const [values, setValues] = useState<IntegrationValues>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    void loadIntegration(widgetId).then((next) => {
      if (!live) return
      setValues(next)
      setReady(true)
    })
    const unsubscribe = subscribeIntegrations(() => {
      void loadIntegration(widgetId).then((next) => {
        if (live) setValues(next)
      })
    })
    return () => {
      live = false
      unsubscribe()
    }
  }, [widgetId])

  const save = useCallback(
    async (patch: IntegrationValues) => {
      const next = await saveIntegration(widgetId, patch)
      setValues(next)
      return next
    },
    [widgetId],
  )

  return { values, ready, save }
}
