import type { ElementType, ReactNode } from 'react'
import { useInView } from '../../lib/motion'

interface RevealProps {
  children: ReactNode
  delay?: number
  as?: ElementType
  className?: string
}

/** Wraps content in a scroll-triggered rise. Honours reduced-motion via CSS. */
export default function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? 'reveal-in' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  )
}
