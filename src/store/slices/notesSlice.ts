import type { StateCreator } from 'zustand'
import type { Todo } from '@/types'
import type { AppState } from '../appState'
import { MAX_NOTES_LENGTH, MAX_TODO_LENGTH, newId } from './shared'

export interface NotesSlice {
  /** Scratchpad text. Saved on every keystroke. */
  notes: string
  todos: Todo[]
  setNotes: (text: string) => void
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
  clearCompletedTodos: () => void
}

export const createNotesSlice: StateCreator<AppState, [], [], NotesSlice> = (set) => ({
  notes: '',
  todos: [],
  setNotes: (text) => set({ notes: text.slice(0, MAX_NOTES_LENGTH) }),
  addTodo: (text) => {
    const clean = text.trim().slice(0, MAX_TODO_LENGTH)
    if (!clean) return
    set((s) => ({ todos: [...s.todos, { id: newId(), text: clean, done: false, createdAt: Date.now() }] }))
  },
  toggleTodo: (id) => set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
  removeTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
  clearCompletedTodos: () => set((s) => ({ todos: s.todos.filter((t) => !t.done) })),
})
