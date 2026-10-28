import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Toaster } from '@/components/ui/sonner'
import { StudioProvider } from '@/lib/studio-store'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
})

export const metadata: Metadata = {
  title: {
    default: 'ScentBuild Studio — Your Custom Fragrance Builder',
    template: '%s · ScentBuild Studio',
  },
  description:
    'Design a fragrance that is truly yours. Layer top, heart and base notes, get guided by our scent concierge, and preview your bottle before you buy.',
  generator: 'v0.app',
  icons: {
    icon: '/images/scentbuild-mark.png',
    apple: '/images/scentbuild-mark.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#24101F',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${cormorant.variable} bg-background`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <StudioProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-espresso focus:px-4 focus:py-2 focus:text-ivory"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <Toaster position="bottom-center" />
        </StudioProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
