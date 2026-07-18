import { useRef, type ReactNode } from 'react'
import { gsap, registerGsap, useGSAP } from '../lib/gsapSetup'

registerGsap()

type PageEnterProps = {
  children: ReactNode
  className?: string
  /** Muda para repetir a entrada (ex.: troca de filtro). */
  replayKey?: string | number
}

/**
 * Entrada profissional da página via GSAP + useGSAP.
 * Marque elementos com data-enter="header" | "block" | "item" | "chip".
 * Sem contagem de números — só movimento e fade.
 */
export function PageEnter({ children, className, replayKey }: PageEnterProps) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return

      const q = gsap.utils.selector(root)
      const header = q('[data-enter="header"]')
      const blocks = q('[data-enter="block"]')
      const chips = q('[data-enter="chip"]')
      const items = q('[data-enter="item"]')

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out', overwrite: 'auto' },
      })

      if (header.length) {
        tl.from(header, {
          autoAlpha: 0,
          y: 26,
          duration: 0.58,
        })
      }

      if (blocks.length) {
        tl.from(
          blocks,
          {
            autoAlpha: 0,
            y: 20,
            duration: 0.5,
            stagger: { each: 0.07, from: 'start' },
          },
          header.length ? '-=0.32' : 0,
        )
      }

      if (chips.length) {
        tl.from(
          chips,
          {
            autoAlpha: 0,
            y: 10,
            scale: 0.94,
            duration: 0.36,
            stagger: 0.028,
          },
          '-=0.36',
        )
      }

      if (items.length) {
        tl.from(
          items,
          {
            autoAlpha: 0,
            y: 12,
            duration: 0.38,
            stagger: { each: 0.032, from: 'start' },
          },
          '-=0.28',
        )
      }
    },
    {
      scope: root,
      dependencies: replayKey === undefined ? [] : [replayKey],
      revertOnUpdate: replayKey !== undefined,
    },
  )

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  )
}
