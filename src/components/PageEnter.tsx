import { useRef, type ReactNode } from 'react'
import {
  EASE,
  gsap,
  prefersReducedMotion,
  registerGsap,
  ScrollTrigger,
  useGSAP,
} from '../lib/gsapSetup'

registerGsap()

type PageEnterProps = {
  children: ReactNode
  className?: string
  replayKey?: string | number
}

/**
 * Coreografia de entrada do app Casamento.
 * data-enter: hero | header | block | chip | item | row
 */
export function PageEnter({ children, className, replayKey }: PageEnterProps) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const heroes = gsap.utils.toArray<HTMLElement>(q('[data-enter="hero"]'))
      const headers = gsap.utils.toArray<HTMLElement>(q('[data-enter="header"]'))
      const blocks = gsap.utils.toArray<HTMLElement>(q('[data-enter="block"]'))
      const chips = gsap.utils.toArray<HTMLElement>(q('[data-enter="chip"]'))
      const items = gsap.utils.toArray<HTMLElement>(q('[data-enter="item"]'))
      const rows = gsap.utils.toArray<HTMLElement>(q('[data-enter="row"]'))
      const marked = [...heroes, ...headers, ...blocks, ...chips, ...items, ...rows]

      if (prefersReducedMotion()) {
        gsap.set(marked, { clearProps: 'all' })
        return
      }

      // Estado inicial — cada tipo tem personalidade própria
      gsap.set(heroes, {
        opacity: 0,
        y: 42,
        scale: 0.94,
        filter: 'blur(6px)',
      })
      gsap.set(headers, {
        opacity: 0,
        y: 28,
        filter: 'blur(4px)',
      })
      gsap.set(blocks, {
        opacity: 0,
        y: 32,
        scale: 0.975,
        filter: 'blur(3px)',
      })
      gsap.set(chips, {
        opacity: 0,
        y: 16,
        scale: 0.86,
        rotate: -1.5,
      })
      gsap.set(items, {
        opacity: 0,
        y: 22,
        scale: 0.98,
      })
      gsap.set(rows, {
        opacity: 0,
        x: -14,
        filter: 'blur(2px)',
      })

      const tl = gsap.timeline({
        defaults: { ease: EASE.lift, overwrite: 'auto' },
      })

      if (headers.length) {
        tl.to(headers, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.7,
          stagger: 0.09,
        })
      }

      if (heroes.length) {
        tl.to(
          heroes,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.85,
            ease: EASE.pop,
            stagger: 0.12,
          },
          headers.length ? '-=0.4' : 0,
        )
      }

      if (blocks.length) {
        tl.to(
          blocks,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.6,
            stagger: { each: 0.07, from: 'start' },
            ease: EASE.soft,
          },
          '-=0.45',
        )
      }

      if (chips.length) {
        tl.to(
          chips,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotate: 0,
            duration: 0.48,
            stagger: { each: 0.04, from: 'center' },
            ease: EASE.pop,
          },
          '-=0.4',
        )
      }

      const earlyItems = items.slice(0, 10)
      const lateItems = items.slice(10)

      if (earlyItems.length) {
        tl.to(
          earlyItems,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.48,
            stagger: { each: 0.05, from: 'start' },
            ease: EASE.soft,
          },
          '-=0.3',
        )
      }

      // Itens além dos primeiros: já ficam visíveis (ScrollTrigger no mobile
      // deixava cards “invisíveis” pra sempre — inclusive após criar novos).
      if (lateItems.length) {
        gsap.set(lateItems, { clearProps: 'transform,opacity,filter' })
      }

      if (rows.length) {
        tl.to(
          rows,
          {
            opacity: 1,
            x: 0,
            filter: 'blur(0px)',
            duration: 0.45,
            stagger: 0.045,
            ease: EASE.silk,
          },
          '-=0.32',
        )
      }

      tl.eventCallback('onComplete', () => {
        gsap.set([...heroes, ...headers, ...blocks, ...chips, ...earlyItems, ...rows], {
          clearProps: 'transform,opacity,filter',
        })
        // Garante que nada ficou preso invisível após a entrada
        gsap.set(items, { clearProps: 'transform,opacity,filter' })
      })

      // Micro-press tátil
      const pressables = root.current?.querySelectorAll(
        'button, a, [data-enter="block"], [data-enter="item"], [data-enter="chip"], [data-enter="hero"]',
      )
      const cleanups: Array<() => void> = []

      pressables?.forEach((node) => {
        const el = node as HTMLElement
        if (el.dataset.motionPress === 'off') return

        const down = () => {
          gsap.to(el, {
            scale: 0.975,
            duration: 0.12,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        }
        const up = () => {
          gsap.to(el, {
            scale: 1,
            duration: 0.4,
            ease: EASE.pop,
            overwrite: 'auto',
            clearProps: 'transform',
          })
        }

        el.addEventListener('pointerdown', down)
        el.addEventListener('pointerup', up)
        el.addEventListener('pointerleave', up)
        el.addEventListener('pointercancel', up)
        cleanups.push(() => {
          el.removeEventListener('pointerdown', down)
          el.removeEventListener('pointerup', up)
          el.removeEventListener('pointerleave', up)
          el.removeEventListener('pointercancel', up)
        })
      })

      return () => {
        cleanups.forEach((fn) => fn())
        ScrollTrigger.getAll().forEach((st) => {
          if (root.current?.contains(st.trigger as Node)) st.kill()
        })
      }
    },
    {
      scope: root,
      dependencies: replayKey === undefined ? [] : [replayKey],
      revertOnUpdate: true,
    },
  )

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  )
}
