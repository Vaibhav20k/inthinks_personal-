import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { site } from '../../data/site'

interface Props {
  /** The page's own name. The site name is appended; do not include it. */
  title: string
  description: string
  /**
   * Pages that should not be indexed — a record that exists but is not meant
   * to be found from a search engine.
   */
  noindex?: boolean
}

/** Sets or creates a meta/link tag, so a page can own its own head. */
function set(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

/**
 * One page's metadata.
 *
 * A single-page app serves one `index.html` to every route, so without this
 * every page shares the homepage's title, description and canonical — which
 * means a search engine sees fourteen copies of one page, and a shared link to
 * a technology record previews as the homepage.
 *
 * Written on navigation rather than rendered into the markup, because there is
 * no server render to put it in. Crawlers that execute JavaScript read it;
 * those that do not fall back to what `index.html` carries, which is the
 * homepage's — the honest limit of a static SPA, and the reason the sitemap
 * lists every route explicitly.
 */
export default function PageMeta({ title, description, noindex = false }: Props) {
  const { pathname } = useLocation()

  useEffect(() => {
    const full = `${title} — ${site.name}`
    document.title = full

    set('meta[name="description"]', () => {
      const m = document.createElement('meta')
      m.setAttribute('name', 'description')
      return m
    }, 'content', description)

    // The canonical is the apex, always: the site answers on www too, and two
    // hostnames serving identical content is two sites to a search engine.
    set('link[rel="canonical"]', () => {
      const l = document.createElement('link')
      l.setAttribute('rel', 'canonical')
      return l
    }, 'href', `https://${site.domain}${pathname}`)

    for (const [property, value] of [
      ['og:title', full],
      ['og:description', description],
      ['og:url', `https://${site.domain}${pathname}`],
      ['og:type', 'website'],
      ['og:site_name', site.name],
    ] as const) {
      set(`meta[property="${property}"]`, () => {
        const m = document.createElement('meta')
        m.setAttribute('property', property)
        return m
      }, 'content', value)
    }

    for (const [name, value] of [
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', full],
      ['twitter:description', description],
    ] as const) {
      set(`meta[name="${name}"]`, () => {
        const m = document.createElement('meta')
        m.setAttribute('name', name)
        return m
      }, 'content', value)
    }

    const robots = document.head.querySelector('meta[name="robots"]')
    if (noindex) {
      set('meta[name="robots"]', () => {
        const m = document.createElement('meta')
        m.setAttribute('name', 'robots')
        return m
      }, 'content', 'noindex, nofollow')
    } else if (robots) {
      // Navigating from a noindex page to an indexable one must not leave the
      // tag behind — the next page would inherit it silently.
      robots.remove()
    }
  }, [title, description, pathname, noindex])

  return null
}
