import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useInView } from '../../lib/motion'

interface RevealProps {
  children: ReactNode
  delay?: number
  as?: ElementType
  className?: string
}

/** Scroll-triggered rise. Collapses to an instant state under reduced motion. */
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
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
