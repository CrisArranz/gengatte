import type { ReactNode } from 'react'

export function Panel({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`border-2 border-current p-4 ${className}`}>
      <h2 className="font-display mb-3 text-lg uppercase">{title}</h2>
      {children}
    </section>
  )
}
