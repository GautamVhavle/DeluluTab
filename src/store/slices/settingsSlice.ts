import type { StateCreator } from 'zustand'
import { createDefaultConfig } from '@/config/defaults'
import type { Settings } from '@/types'
import type { AppState } from '../appState'

export interface SettingsSlice {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  settings: createDefaultConfig().settings,
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
})
