import { useState } from 'react'
import { faqs } from '../content'
import Icon from './Icon'
import Section, { SectionHeading } from './Section'

export default function Faq() {
  const [open, setOpen] = useState(0)

  return (
    <Section id="faq" className="border-t border-white/5">
      <SectionHeading eyebrow="FAQ" title="Questions, answered" />
      <div className="mx-auto mt-12 max-w-3xl divide-y divide-white/10 border-y border-white/10">
        {faqs.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="text-sm font-medium text-white sm:text-base">{item.q}</span>
                <Icon
                  name="plus"
                  className={`h-4 w-4 shrink-0 text-ink-300 transition-transform duration-200 ${
                    isOpen ? 'rotate-45' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <p className="-mt-1 pb-5 pr-10 text-sm leading-relaxed text-ink-300">
                  {item.a}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}
