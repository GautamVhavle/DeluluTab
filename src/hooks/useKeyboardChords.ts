import { useEffect, useState } from 'react'
import { createChordEngine, IDLE_STATE, resolveChords, type ChordEngineState } from '@/utils/chords'
import { navigateTo } from '@/utils/navigate'
import { useAppStore } from '@/store/useAppStore'

/** Lets the success state paint before the page navigates away. */
const NAVIGATE_DELAY_MS = 150

/** Installs the global chord listener and returns the live engine state for the HUD. */
export function useKeyboardChords(): ChordEngineState {
  const [state, setState] = useState<ChordEngineState>(IDLE_STATE)

  useEffect(() => {
    const engine = createChordEngine({
      getConfig: () => {
        const { settings, chords, shortcuts } = useAppStore.getState()
        return {
          trigger: settings.chordTrigger,
          windowMs: settings.chordWindowMs,
          chords: resolveChords(chords, shortcuts),
        }
      },
      onChange: setState,
      onMatch: (chord) => window.setTimeout(() => navigateTo(chord.url), NAVIGATE_DELAY_MS),
      // Typing in a dialog (add shortcut, chord manager…) must never trigger chords.
      isBlocked: () => !!document.querySelector('[role="dialog"]'),
    })

    const onKeyDown = (e: KeyboardEvent) => engine.handleKeyDown(e)
    const cancel = () => engine.cancel()
    // Capture phase so we see keys before the focused input does.
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('blur', cancel)
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('blur', cancel)
      engine.dispose()
    }
  }, [])

  return state
}
