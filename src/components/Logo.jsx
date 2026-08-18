import { site } from '../content'

export default function Logo() {
  return (
    <a href="#top" className="group flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-600/25">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4.5c-3.6 0-6 2.4-6 5.4 0 1.9.9 3.1 1.9 4.1.6.6.9 1.2.9 2v1.2h6.4V16c0-.8.3-1.4.9-2 1-1 1.9-2.2 1.9-4.1 0-3-2.4-5.4-6-5.4Z" />
          <path d="M10 20.5h4" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">
        {site.name}
      </span>
    </a>
  )
}
