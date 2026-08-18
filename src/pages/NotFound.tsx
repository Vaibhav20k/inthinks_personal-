import Button from '../components/primitives/Button'

export default function NotFound() {
  return (
    <section className="container-grid pb-28 pt-36 sm:pt-44">
      <p className="ident" style={{ color: 'var(--color-accent)' }}>404</p>
      <h1 className="statement-type mt-4 max-w-[16ch]">That page isn&rsquo;t here.</h1>
      <p className="body-type measure-prose mt-6" style={{ color: 'var(--color-muted)' }}>
        The link may be out of date, or the reference may not exist in the portfolio.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button to="/">Back to home</Button>
        <Button to="/technologies" variant="outline">Technology Explorer</Button>
      </div>
    </section>
  )
}
