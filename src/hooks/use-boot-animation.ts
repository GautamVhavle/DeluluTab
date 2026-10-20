import { useLayoutEffect, type RefObject } from 'react'
import { gsap } from 'gsap'

/**
 * Entrance timeline for first paint. Animates elements marked with
 * `data-boot="header" | "dashboard" | "switcher"` inside `scope`.
 *
 * GSAP only touches those wrapper elements; everything inside the dashboard is
 * driven by Framer Motion, so the two libraries never fight over one element.
 */
export function useBootAnimation(scope: RefObject<HTMLElement | null>, ready: boolean) {
  useLayoutEffect(() => {
    if (!ready || !scope.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out', clearProps: 'transform,opacity' } })
        .from('[data-boot="header"]', { y: -16, opacity: 0, duration: 0.6 })
        .from('[data-boot="dashboard"]', { y: 28, scale: 0.97, opacity: 0, duration: 0.8 }, '-=0.35')
        .from('[data-boot="switcher"]', { y: 20, opacity: 0, duration: 0.5 }, '-=0.4')
    }, scope)

    return () => ctx.revert()
  }, [scope, ready])
}
