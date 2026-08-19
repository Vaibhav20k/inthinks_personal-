import { useEffect, useRef, useState } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/motion'

interface Section {
  id: string
  label: string
  /** The phase of the argument this section belongs to. */
  thread: string
}

interface Props {
  sections: Section[]
}

/**
 * The page thread — sections 7 and 26 of the brief, which are one thing.
 *
 * The qualified connection selected in the hero does not stop at the hero. It
 * continues down the left margin as a single line, and renames itself as the
 * argument changes: a match signal becomes a technology path, becomes
 * development progress, becomes a commercial pathway. That is the business
 * model stated as one continuous mark instead of four separate sections.
 *
 * The filled length tracks scroll distance rather than section index, because
 * a thread that jumps in twelve steps is a progress bar wearing a costume. The
 * coordinate and the labels are discrete; the line is not.
 *
 * Desktop only: on a phone it would cost more screen than it returns. It also
 * withdraws whenever the window is too narrow to hold it clear of the content
 * column — the thread lives in the left margin, and at laptop widths there is
 * no left margin, so it would otherwise print itself over the section labels.
 */
export default function ScrollCoordinate({ sections }: Props) {
  const isDesktop = useMediaQuery('(width >= 80rem)')
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  /** Whether the window is wide enough for the thread to sit clear of the page. */
  const [hasRoom, setHasRoom] = useState(false)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isDesktop) return
    let frame = 0

    const measure = () => {
      frame = 0
      // Measured, not a breakpoint: the gutter is a clamp against viewport
      // width and the container is capped, so where the content starts is not
      // something a media query can be trusted to predict.
      const content = document.querySelector('.container-grid')
      const rail = railRef.current
      if (content && rail) {
        // The padded edge, not the box edge: the container's gutter is where
        // the page actually starts painting, and that is what the rail has to
        // stay clear of.
        const box = content.getBoundingClientRect()
        const painted = box.left + parseFloat(getComputedStyle(content).paddingLeft || '0')
        setHasRoom(painted >= 20 + rail.getBoundingClientRect().width + 16)
      }
      // The section whose top has most recently passed the upper third.
      const line = window.innerHeight / 3
      let current = 0
      sections.forEach((section, i) => {
        const el = document.getElementById(section.id)
        if (el && el.getBoundingClientRect().top <= line) current = i
      })
      setIndex(current)

      const travel = document.documentElement.scrollHeight - window.innerHeight
      setProgress(travel > 0 ? Math.min(1, Math.max(0, window.scrollY / travel)) : 0)
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

  const section = sections[index]
  const ease = reduced ? 'none' : 'var(--ease-instrument)'

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-5 top-1/2 z-30 w-32 -translate-y-1/2"
      ref={railRef}
      style={{
        opacity: visible && hasRoom ? 1 : 0,
        transition: reduced ? 'none' : `opacity 600ms ${ease}`,
      }}
    >
      <p className="label tabular-nums" style={{ color: 'var(--color-accent-deep)' }}>
        {String(index + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
      </p>

      {/* The thread. One line, continuous, filled by distance travelled. */}
      <div className="relative my-3 w-px" style={{ height: '42vh', background: 'var(--rule)' }}>
        <div
          className="absolute left-0 top-0 w-px"
          style={{
            height: `${progress * 100}%`,
            background: 'var(--color-accent)',
            transition: reduced ? 'none' : `height 180ms linear`,
          }}
        />
        {/* The travelling node: where the page currently is on the thread. */}
        <span
          className="absolute -left-[2px] block h-[5px] w-[5px]"
          style={{
            top: `calc(${progress * 100}% - 2px)`,
            background: 'var(--color-accent)',
            transition: reduced ? 'none' : `top 180ms linear`,
          }}
        />
      </div>

      {/* Bounded, like the label below it. Without a max-width the thread name
          sets the rail's whole width, and "DEVELOPMENT PROGRESS" is wide enough
          to decide on its own whether the rail fits in the margin. */}
      <p className="label max-w-[8rem]" style={{ color: 'var(--color-accent-deep)' }}>
        {section?.thread.toUpperCase()}
      </p>
      <p className="label mt-1.5 max-w-[8rem]" style={{ color: 'var(--color-faint)' }}>
        {section?.label.toUpperCase()}
      </p>
    </div>
  )
}
