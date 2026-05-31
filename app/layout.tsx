import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Learning Agent',
  description: 'AI 应用开发工程师真实面试官 Agent',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
