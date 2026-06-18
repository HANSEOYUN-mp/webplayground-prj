import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Dancing_Script } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/auth-context"
import './globals.css'

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const _jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
const _dancingScript = Dancing_Script({ subsets: ["latin"], variable: "--font-dancing-script", weight: ["700"] });

export const metadata: Metadata = {
  title: 'Insightra',
  description: '친구와 함께 지식을 공유하고, 코드 스니펫과 아이디어를 자유롭게 나누는 플레이그라운드입니다.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1a2e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${_inter.variable} ${_jetbrainsMono.variable} ${_dancingScript.variable} font-sans antialiased text-foreground min-h-screen relative`}>
        {/* 전체 사이트에 적용되는 한국 전통 격자 배경 */}
        <div className="fixed inset-0 z-[-1] hanji-grid" />
        
        <AuthProvider>
          {children}
          <Toaster />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
}
