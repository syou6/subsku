'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeNext } from '@/lib/safe-redirect'
import styles from './login.module.css'

type AuthTab = 'login' | 'signup'
type Status = 'idle' | 'busy' | 'sent' | 'error'

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'))

  const [tab, setTab] = useState<AuthTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  const busy = status === 'busy'

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

  const fail = (m: string) => {
    setStatus('error')
    setOk(false)
    setMsg(m)
  }

  // ----- email + password (primary) -----
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setStatus('busy')
    setMsg('')
    const supabase = createClient()

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) return fail('メールかパスワードが違うで。')
      router.replace(next)
      router.refresh()
      return
    }

    // signup
    if (password.length < 8) return fail('パスワードは8文字以上にしてな。')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo() },
    })
    if (error) return fail('登録できへんかった。メールを確認してな。')
    if (data.session) {
      // Email confirmation is off — signed in immediately.
      router.replace(next)
      router.refresh()
      return
    }
    // Confirmation required — a verification email was sent.
    setStatus('sent')
    setOk(true)
    setMsg('確認メールを送った。リンクを踏んだらログイン完了や。')
  }

  // ----- magic link (no password) -----
  const sendMagicLink = async () => {
    if (!email.trim()) return fail('メールアドレスを入れてな。')
    setStatus('busy')
    setMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    })
    if (error) return fail('送信できへんかった。メールアドレスを確認してな。')
    setStatus('sent')
    setOk(true)
    setMsg('ログインリンクを送った。メールを確認してな。')
  }

  return (
    <main className={styles.page}>
      <div className={styles.glow} />
      <div className={styles.card}>
        <span className={styles.mark}>BURN</span>
        <h1 className={styles.h1}>ログイン / 新規登録</h1>
        <p className={styles.sub}>メールとパスワードで。メールリンクでも入れるで。</p>

        <div className={styles.tabs}>
          <button
            type="button"
            className={tab === 'login' ? styles.tabOn : styles.tab}
            onClick={() => setTab('login')}
          >
            ログイン
          </button>
          <button
            type="button"
            className={tab === 'signup' ? styles.tabOn : styles.tab}
            onClick={() => setTab('signup')}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={submitPassword} className={styles.form}>
          <input
            className={styles.input}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
          <input
            className={styles.input}
            type="password"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            placeholder={tab === 'login' ? 'パスワード' : 'パスワード（8文字以上）'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
          <button
            className={styles.submit}
            type="submit"
            disabled={busy || !email.trim() || !password}
          >
            {busy ? '処理中…' : tab === 'login' ? 'ログイン' : '新規登録'}
          </button>
        </form>

        <button type="button" className={styles.linkBtn} onClick={sendMagicLink} disabled={busy}>
          パスワード無しでログイン（メールリンク）
        </button>

        {msg && <div className={ok ? styles.ok : styles.err}>{msg}</div>}
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
