import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BURN — ひとりスタートアップの燃焼率',
  description:
    'AIツール・SaaSの月額をまとめて、燃焼率（バーンレート）とランウェイ、黒字化までの距離を一目で。ひとり開発者のためのコスト管理。',
}

export const viewport: Viewport = {
  themeColor: '#13100e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
