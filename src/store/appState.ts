import type { LibrarySlice } from './slices/librarySlice'
import type { NotesSlice } from './slices/notesSlice'
import type { SessionSlice } from './slices/sessionSlice'
import type { SettingsSlice } from './slices/settingsSlice'
import type { StashSlice } from './slices/stashSlice'
import type { WidgetSlice } from './slices/widgetSlice'

/** The whole client state. Each slice owns one concern; this is only their intersection. */
export interface AppState extends SettingsSlice, LibrarySlice, WidgetSlice, NotesSlice, StashSlice, SessionSlice {}
