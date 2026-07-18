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
 * clearProps no fim evita itens “sumirem” no mobile.
 */
export function PageEnter({ children, className, replayKey }: PageEnterProps) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const q = gsap.utils.selector(root)
      const header = q('[data-enter="header"]')
      const blocks = q('[data-enter="block"]')
      const chips = q('[data-enter="chip"]')
      const items = q('[data-enter="item"]')
      const all = [...header, ...blocks, ...chips, ...items]

      if (reduced) {
        gsap.set(all, { clearProps: 'all' })
        return
      }

      if (header.length) gsap.set(header, { opacity: 0, y: 22 })
      if (blocks.length) gsap.set(blocks, { opacity: 0, y: 18 })
      if (chips.length) gsap.set(chips, { opacity: 0, y: 10, scale: 0.96 })
      if (items.length) gsap.set(items, { opacity: 0, y: 12 })

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out', overwrite: 'auto' },
        onComplete: () => {
          gsap.set(all, { clearProps: 'all' })
        },
      })

      if (header.length) {
        tl.to(header, { opacity: 1, y: 0, duration: 0.5 })
      }

      if (blocks.length) {
        tl.to(
          blocks,
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: { each: 0.06, from: 'start' },
          },
          header.length ? '-=0.28' : 0,
        )
      }

      if (chips.length) {
        tl.to(
          chips,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.32,
            stagger: 0.025,
          },
          '-=0.3',
        )
      }

      if (items.length) {
        tl.to(
          items,
          {
            opacity: 1,
            y: 0,
            duration: 0.34,
            stagger: { each: 0.028, from: 'start' },
          },
          '-=0.24',
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
