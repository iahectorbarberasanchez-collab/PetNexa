import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PetNexa – La App para tu Mascota',
  description: 'La plataforma definitiva para dueños de mascotas. Cartilla médica, red social, alertas y mucho más.',
  keywords: ['mascotas', 'perros', 'gatos', 'veterinario', 'cuidado animal', 'petnexa'],
  manifest: '/manifest.json',
  themeColor: '#6C3FF5',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PetNexa',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'PetNexa – La App para tu Mascota',
    description: 'Todo lo que tu mascota necesita en un solo lugar.',
    type: 'website',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'mobile-web-app-capable': 'yes',
  }
}

import PWAHandler from '@/components/PWAHandler'
import MobileNav from '@/components/MobileNav'
import MobileHeader from '@/components/MobileHeader'
import { ToastProvider } from '@/components/ToastProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="noise-overlay" />
        <ToastProvider>
          <MobileHeader />
          <PWAHandler />
          {children}
          <MobileNav />
        </ToastProvider>
      </body>
    </html>
  )
}
