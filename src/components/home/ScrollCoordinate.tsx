import { useEffect, useState } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/motion'

interface Props {
  /** Section ids in document order, with the name each one reports. */
  sections: { id: string; label: string }[]
}

/**
 * Section 26 — page position as a technical coordinate rather than a
 * percentage bar. It reports which part of the argument you are standing in,
 * which a percentage cannot.
 *
 * Desktop only: on a phone it would cost more screen than it returns.
 */
export default function ScrollCoordinate({ sections }: Props) {
  const isDesktop = useMediaQuery('(width >= 80rem)')
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isDesktop) return
    let frame = 0

    const measure = () => {
      frame = 0
      // The section whose top has most recently passed the upper third.
      const line = window.innerHeight / 3
      let current = 0
      sections.forEach((section, i) => {
        const el = document.getElementById(section.id)
        if (el && el.getBoundingClientRect().top <= line) current = i
      })
      setIndex(current)
      setVisible(window.scrollY > window.innerHeight * 0.4)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [isDesktop, sections])

  if (!isDesktop) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-5 top-1/2 z-30 -translate-y-1/2"
      style={{
        opacity: visible ? 1 : 0,
        transition: reduced ? 'none' : 'opacity 600ms var(--ease-instrument)',
      }}
    >
      <p className="label" style={{ color: 'var(--color-accent)' }}>
        {String(index + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
      </p>
      {/* Vertical rule: the thread the page is travelling along. */}
      <div className="my-3 h-24 w-px" style={{ background: 'var(--rule)' }}>
        <div
          className="w-px"
          style={{
            height: `${((index + 1) / sections.length) * 100}%`,
            background: 'var(--color-accent)',
            transition: reduced ? 'none' : 'height 700ms var(--ease-instrument)',
          }}
        />
      </div>
      <p
        className="label max-w-[7rem]"
        style={{ color: 'var(--color-muted)', writingMode: 'horizontal-tb' }}
      >
        {sections[index]?.label.toUpperCase()}
      </p>
    </div>
  )
}
