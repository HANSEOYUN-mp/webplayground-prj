import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/auth-context"
import './globals.css'

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const _jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: 'KnowledgeHub - 코인부자 김인태와 코인 거지 한서윤의 Playground',
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
      <body className={`${_inter.variable} ${_jetbrainsMono.variable} font-sans antialiased text-white min-h-screen relative`}>
        {/* 전체 사이트에 적용되는 우주/블랙홀 배경 */}
        <div className="fixed inset-0 z-[-1]">
          <img 
            src="/galaxy-bg.jpg" 
            alt="Galaxy Background" 
            className="w-full h-full object-cover opacity-90 scale-100" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80 pointer-events-none" />
        </div>
        
        <AuthProvider>
          {children}
          <Toaster />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
}
