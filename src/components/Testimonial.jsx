import { testimonial } from '../content'
import Section from './Section'

export default function Testimonial() {
  return (
    <Section className="border-t border-white/5">
      <figure className="mx-auto max-w-3xl text-center">
        <blockquote className="text-xl font-medium leading-relaxed text-white sm:text-2xl">
          “{testimonial.quote}”
        </blockquote>
        <figcaption className="mt-8 flex items-center justify-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-semibold text-white">
            {testimonial.author.charAt(0)}
          </span>
          <span className="text-left">
            <span className="block text-sm font-medium text-white">{testimonial.author}</span>
            <span className="block text-xs text-ink-500">{testimonial.role}</span>
          </span>
        </figcaption>
      </figure>
    </Section>
  )
}
