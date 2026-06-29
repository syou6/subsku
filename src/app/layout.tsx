import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://subsku.vercel.app'),
  title: 'BURN — ひとりスタートアップの燃焼率',
  description:
    'AIツール・SaaSの月額をまとめて、燃焼率（バーンレート）とランウェイ、黒字化までの距離を一目で。ひとり開発者のためのコスト管理。',
  openGraph: {
    title: 'BURN — ひとりスタートアップの燃焼率',
    description:
      'AIツール・SaaSの月額をまとめて、バーンレート・ランウェイ・黒字化までの距離を一目で。',
    url: '/',
    siteName: 'BURN',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BURN — ひとりスタートアップの燃焼率',
    description:
      'AIツール・SaaSの月額をまとめて、バーンレート・ランウェイ・黒字化までの距離を一目で。',
  },
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
