import type { IconType } from 'react-icons'
import { Coffee, Pause, Play, Restore, SkipForward, VolumeOff, Waveform } from '@/lib/icons'
import { FaCloudShowersHeavy } from 'react-icons/fa6'
import { AMBIENT_KINDS, type AmbientKind } from '@/lib/ambient'
import { formatClock, type Phase } from '@/lib/pomodoro'
import { cn } from '@/lib/utils'
import { useAmbient } from '@/hooks/useAmbient'
import { usePomodoro } from '@/hooks/usePomodoro'
import type { WidgetProps } from './types'

const SOUND_ICONS: Record<AmbientKind, IconType> = { rain: FaCloudShowersHeavy, cafe: Coffee, white: Waveform }

const PHASE_LABEL: Record<Phase, string> = { work: 'Focus', break: 'Break' }

function Ring({ progress, phase, size, children }: { progress: number; phase: Phase; size: number; children?: React.ReactNode }) {
  const stroke = Math.max(4, size / 16)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-secondary" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className={cn('transition-[stroke-dashoffset] duration-300', phase === 'work' ? 'stroke-primary' : 'stroke-emerald-400')}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

function IconButton({ label, onClick, children, active, className }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        'grid place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function PomodoroWidget({ mode }: WidgetProps) {
  const t = usePomodoro()
  const ambient = useAmbient()
  const { state } = t
  const running = state.status === 'running'
  const clock = formatClock(t.remainingMs)
  const label = `${PHASE_LABEL[state.phase]} timer, ${clock} ${running ? 'remaining' : state.status === 'paused' ? 'paused' : 'ready'}`

  const playPause = (
    <IconButton label={running ? 'Pause timer' : state.status === 'paused' ? 'Resume timer' : 'Start timer'} onClick={running ? t.pause : t.play} className={cn('bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground', mode === 'detailed' ? 'h-10 w-10' : 'h-8 w-8')}>
      {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
    </IconButton>
  )

  if (mode === 'compact' || mode === 'focus') {
    const focus = mode === 'focus'
    return (
      <div className={cn('flex h-full items-center', focus ? 'justify-center gap-5' : 'gap-3')}>
        {playPause}
        <div role="timer" aria-label={label} className="flex items-baseline gap-2">
          <span className={cn('font-light tabular-nums tracking-tight', focus ? 'text-4xl' : 'text-2xl')}>{clock}</span>
          <span className="text-xs text-muted-foreground">{PHASE_LABEL[state.phase]}</span>
        </div>
        <IconButton label="Reset timer" onClick={t.reset} className="h-7 w-7"><Restore className="h-3.5 w-3.5" /></IconButton>
        {!focus && (
          <div className="ml-auto flex gap-0.5" role="group" aria-label="Ambient sound">
            {AMBIENT_KINDS.map(({ kind, label: name }) => {
              const Icon = SOUND_ICONS[kind]
              return <IconButton key={kind} label={`${name} sound`} active={ambient.kind === kind} onClick={() => ambient.toggle(kind)} className="h-7 w-7"><Icon className="h-3.5 w-3.5" /></IconButton>
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full items-center gap-5">
      <Ring progress={t.progress} phase={state.phase} size={104}>
        <div role="timer" aria-label={label} className="text-center">
          <p className="text-2xl font-light tabular-nums leading-none tracking-tight">{clock}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{PHASE_LABEL[state.phase]}</p>
        </div>
      </Ring>

      <div className="grid min-w-0 flex-1 gap-2.5">
        <div className="flex items-center gap-2">
          {playPause}
          <IconButton label="Reset timer" onClick={t.reset} className="h-8 w-8"><Restore className="h-3.5 w-3.5" /></IconButton>
          <IconButton label={state.phase === 'work' ? 'Skip to break' : 'Skip to focus'} onClick={t.skip} className="h-8 w-8"><SkipForward className="h-3.5 w-3.5" /></IconButton>
          <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">
            {t.completedToday === 0 ? 'No sessions yet today' : `${t.completedToday} ${t.completedToday === 1 ? 'session' : 'sessions'} today`}
          </p>
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Ambient sound">
          <span className="mr-1 text-xs text-muted-foreground">Sound</span>
          {AMBIENT_KINDS.map(({ kind, label: name }) => {
            const Icon = SOUND_ICONS[kind]
            const active = ambient.kind === kind
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                aria-label={`${name} sound`}
                onClick={() => ambient.toggle(kind)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3 w-3" /> {name}
              </button>
            )
          })}
          {ambient.kind && (
            <button type="button" aria-label="Turn sound off" title="Turn sound off" onClick={() => ambient.toggle(ambient.kind!)} className="ml-0.5 grid h-6 w-6 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <VolumeOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
