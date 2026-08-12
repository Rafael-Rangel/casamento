import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

let registered = false

/** Registra GSAP + useGSAP + ScrollTrigger uma vez. */
export function registerGsap() {
  if (registered) return
  gsap.registerPlugin(useGSAP, ScrollTrigger)
  gsap.defaults({ ease: 'power3.out', force3D: true })
  registered = true
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Ease “casamento”: suave com leve elegância no final. */
export const EASE = {
  soft: 'power3.out',
  lift: 'power4.out',
  pop: 'back.out(1.4)',
  silk: 'sine.out',
} as const

export { gsap, useGSAP, ScrollTrigger }
