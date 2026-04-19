import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TransitFlow AI — Smart Bus Route Optimization',
  description: 'Real-time NSW transport intelligence platform for route optimization, demand analysis, and simulation.',
  keywords: ['bus', 'route', 'optimization', 'NSW', 'transport', 'AI', 'dashboard'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚌</text></svg>" />
      </head>
      <body className="bg-[#07070f] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
