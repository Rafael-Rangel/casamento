import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

let registered = false

/** Registra o plugin React uma única vez. */
export function registerGsap() {
  if (registered) return
  gsap.registerPlugin(useGSAP)
  gsap.defaults({ ease: 'power3.out' })
  registered = true
}

export { gsap, useGSAP }
