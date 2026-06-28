'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './login.module.css'

function LoginInner() {
  const params = useSearchParams()
  const next = params.get('next') || '/app'
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    })
    if (error) {
      setStatus('error')
      setMsg('送信できへんかった。メールアドレスを確認してな。')
    } else {
      setStatus('sent')
      setMsg('ログインリンクを送った。メールを確認してな。')
    }
  }

  const signInGoogle = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo() },
    })
  }

  return (
    <main className={styles.page}>
      <div className={styles.glow} />
      <div className={styles.card}>
        <span className={styles.mark}>BURN</span>
        <h1 className={styles.h1}>ログイン / 新規登録</h1>
        <p className={styles.sub}>メールにログインリンクを送るで。パスワードは要らん。</p>

        <button className={styles.google} onClick={signInGoogle} type="button">
          <span className={styles.gIco}>G</span> Googleで続ける
        </button>

        <div className={styles.divider}>
          <span>または</span>
        </div>

        <form onSubmit={sendMagicLink} className={styles.form}>
          <input
            className={styles.input}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'sending' || status === 'sent'}
          />
          <button
            className={styles.submit}
            type="submit"
            disabled={status === 'sending' || status === 'sent' || !email.trim()}
          >
            {status === 'sending' ? '送信中…' : 'ログインリンクを送る'}
          </button>
        </form>

        {msg && (
          <div className={status === 'error' ? styles.err : styles.ok}>{msg}</div>
        )}
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
