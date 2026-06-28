'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  BurnData,
  Currency,
  GmailHit,
  Plan,
  Project,
  StripeMrr,
  Sub,
} from '@/types'

/* ===================== データ ===================== */
const CATS = ['AI / 汎用', 'コーディング', '画像・音声', 'インフラ', '生産性', 'その他']
const ACCOUNTS = ['通信費', '消耗品費', '新聞図書費', '支払手数料', '外注費', 'その他']

interface Preset {
  name: string
  amount: number
  currency: Currency
  category: string
}

const PRESETS: Preset[] = [
  { name: 'ChatGPT Plus', amount: 20, currency: 'USD', category: 'AI / 汎用' },
  { name: 'ChatGPT Pro', amount: 200, currency: 'USD', category: 'AI / 汎用' },
  { name: 'Claude Pro', amount: 20, currency: 'USD', category: 'AI / 汎用' },
  { name: 'Claude Max', amount: 100, currency: 'USD', category: 'AI / 汎用' },
  { name: 'Gemini (AI Pro)', amount: 20, currency: 'USD', category: 'AI / 汎用' },
  { name: 'Perplexity Pro', amount: 20, currency: 'USD', category: 'AI / 汎用' },
  { name: 'Cursor Pro', amount: 20, currency: 'USD', category: 'コーディング' },
  { name: 'GitHub Copilot', amount: 10, currency: 'USD', category: 'コーディング' },
  { name: 'v0', amount: 20, currency: 'USD', category: 'コーディング' },
  { name: 'Replit Core', amount: 20, currency: 'USD', category: 'コーディング' },
  { name: 'Midjourney', amount: 10, currency: 'USD', category: '画像・音声' },
  { name: 'ElevenLabs', amount: 5, currency: 'USD', category: '画像・音声' },
  { name: 'Vercel Pro', amount: 20, currency: 'USD', category: 'インフラ' },
  { name: 'Notion AI', amount: 10, currency: 'USD', category: '生産性' },
]

/* ===================== ヘルパ ===================== */
const yen = (n: number) => '¥' + Math.round(n).toLocaleString('ja-JP')
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

function ember(t: number): string {
  t = Math.max(0, Math.min(1, t))
  const lo = [0x7a, 0x2e, 0x1a],
    mid = [0xd9, 0x60, 0x2e],
    hi = [0xf2, 0xa3, 0x3c]
  const L = (a: number, b: number, x: number) => Math.round(a + (b - a) * x)
  const H = (c: number[]) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
  if (t < 0.5) {
    const x = t / 0.5
    return H([L(lo[0], mid[0], x), L(lo[1], mid[1], x), L(lo[2], mid[2], x)])
  }
  const x = (t - 0.5) / 0.5
  return H([L(mid[0], hi[0], x), L(mid[1], hi[1], x), L(mid[2], hi[2], x)])
}
function nextCharge(s: Sub): { date: Date; days: number } | null {
  if (!s.billingDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const base = new Date(s.billingDate + 'T00:00:00')
  if (isNaN(base.getTime())) return null
  let next: Date
  if (s.cycle === 'yearly') {
    next = new Date(base)
    while (next < today) next.setFullYear(next.getFullYear() + 1)
  } else {
    next = new Date(today.getFullYear(), today.getMonth(), base.getDate())
    if (next < today) next = new Date(today.getFullYear(), today.getMonth() + 1, base.getDate())
  }
  return { date: next, days: Math.round((next.getTime() - today.getTime()) / 86400000) }
}
const daysLabel = (d: number) => (d === 0 ? '今日' : d === 1 ? '明日' : `${d}日後`)
function daysSince(dateStr: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000))
}
function roast(net: number, days: number | null): { t: string; cls: string } | null {
  if (days == null) return null
  if (net >= 0) return { t: `Day ${days}・黒字化 🎉`, cls: 'g' }
  if (days >= 180) return { t: `Day ${days}・半年赤字、撤退ラインやで 🔥`, cls: 'r' }
  if (days >= 90) return { t: `Day ${days}・まだ赤字 🔥`, cls: 'r' }
  if (days >= 30) return { t: `Day ${days}・そろそろ収益化せな`, cls: 'a' }
  return { t: `Day ${days}・立ち上げ中`, cls: 'd' }
}

interface BurnProps {
  initialData: BurnData
  plan: Plan
  email: string | null
  userId: string
  paymentLink: string
}

export default function Burn({ initialData, plan, email, userId, paymentLink }: BurnProps) {
  const [subs, setSubs] = useState<Sub[]>(initialData.subs)
  const [projects, setProjects] = useState<Project[]>(initialData.projects)
  const [usd, setUsd] = useState(initialData.usd)
  const [eur, setEur] = useState(initialData.eur)
  const [cash, setCash] = useState(initialData.cash)
  const [tax, setTax] = useState(initialData.tax)
  const [view, setView] = useState<'service' | 'category'>(initialData.view)
  const [showSet, setShowSet] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editPid, setEditPid] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const isPro = plan === 'pro'

  // 連携 state
  const [stripeState, setStripeState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [stripeMsg, setStripeMsg] = useState('')
  const [gmailState, setGmailState] = useState<'idle' | 'loading' | 'preview' | 'err'>('idle')
  const [gmailMsg, setGmailMsg] = useState('')
  const [gmailFound, setGmailFound] = useState<(GmailHit & { _on: boolean })[]>([])

  // billing state — one-time (買い切り) purchase via Stripe Payment Link
  const [billingBusy, setBillingBusy] = useState(false)

  // sub form
  const [cn, setCn] = useState('')
  const [ca, setCa] = useState('')
  const [cc, setCc] = useState<Currency>('USD')
  const [ccy, setCcy] = useState<'monthly' | 'yearly'>('monthly')
  const [ccat, setCcat] = useState('AI / 汎用')
  const [cproj, setCproj] = useState('')
  // project form
  const [pn, setPn] = useState('')
  const [pr, setPr] = useState('')
  const [pcur, setPcur] = useState<Currency>('JPY')

  // ----- persistence: debounced save to /api/data -----
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipFirst = useRef(true)
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const payload: BurnData = { subs, projects, usd, eur, cash, tax, view }
      fetch('/api/data', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    }, 600)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [subs, projects, usd, eur, cash, tax, view])

  const fx = (cur: Currency) => (cur === 'USD' ? usd : cur === 'EUR' ? eur : 1)
  const monthly = (s: Sub) => (s.cycle === 'yearly' ? s.amount / 12 : s.amount) * fx(s.currency)
  const projRev = (p: Project) => (p.revenue || 0) * fx(p.currency)

  const sorted = useMemo(() => [...subs].sort((a, b) => monthly(b) - monthly(a)), [subs, usd, eur])
  const toolBurn = useMemo(() => subs.reduce((s, x) => s + monthly(x), 0), [subs, usd, eur])
  const totalRev = useMemo(() => projects.reduce((s, p) => s + projRev(p), 0), [projects, usd, eur])
  const netBurn = toolBurn - totalRev
  const coverage = toolBurn > 0 ? totalRev / toolBurn : 0
  const runway = netBurn > 0 && cash > 0 ? cash / netBurn : null
  const hasRev = projects.length > 0

  const colorFor = (id: string) => {
    if (sorted.length <= 1) return ember(0.75)
    const i = sorted.findIndex((x) => x.id === id)
    return ember(1 - i / (sorted.length - 1))
  }
  const catData = useMemo(() => {
    const m: Record<string, number> = {}
    subs.forEach((s) => {
      const c = s.category || 'その他'
      m[c] = (m[c] || 0) + monthly(s)
    })
    return Object.entries(m)
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val)
  }, [subs, usd, eur])
  const catColor = (name: string) => {
    if (catData.length <= 1) return ember(0.75)
    const i = catData.findIndex((x) => x.name === name)
    return ember(1 - i / (catData.length - 1))
  }
  const upcoming = useMemo(
    () =>
      subs
        .map((s) => ({ s, n: nextCharge(s) }))
        .filter((x): x is { s: Sub; n: { date: Date; days: number } } => !!x.n)
        .sort((a, b) => a.n.days - b.n.days)
        .slice(0, 3),
    [subs],
  )
  const dead = useMemo(() => subs.filter((s) => s.usage === 'low'), [subs])
  const deadMonthly = useMemo(() => dead.reduce((s, x) => s + monthly(x), 0), [dead, usd, eur])
  const projCost = (pid: string) =>
    subs.filter((s) => s.projectId === pid).reduce((s, x) => s + monthly(x), 0)
  const projName = (pid: string) => {
    const p = projects.find((x) => x.id === pid)
    return p ? p.name : null
  }

  const yearExpense = toolBurn * 12
  const taxSaving = yearExpense * (tax / 100)
  const realCost = yearExpense - taxSaving
  const acctData = useMemo(() => {
    const m: Record<string, number> = {}
    subs.forEach((s) => {
      const a = s.account || '未設定'
      m[a] = (m[a] || 0) + monthly(s) * 12
    })
    return Object.entries(m)
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val)
  }, [subs, usd, eur])

  /* actions */
  const addPreset = (p: Preset) =>
    setSubs((s) => [
      ...s,
      {
        id: uid(),
        name: p.name,
        amount: p.amount,
        currency: p.currency,
        cycle: 'monthly',
        category: p.category,
        usage: 'mid',
        billingDate: '',
        projectId: '',
        account: '',
      },
    ])
  const addCustom = () => {
    const amt = parseFloat(ca)
    if (!cn.trim() || !(amt > 0)) return
    setSubs((s) => [
      ...s,
      {
        id: uid(),
        name: cn.trim(),
        amount: amt,
        currency: cc,
        cycle: ccy,
        category: ccat,
        usage: 'mid',
        billingDate: '',
        projectId: cproj,
        account: '',
      },
    ])
    setCn('')
    setCa('')
    setCc('USD')
    setCcy('monthly')
    setCcat('AI / 汎用')
    setCproj('')
  }
  const update = (id: string, patch: Partial<Sub>) =>
    setSubs((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const remove = (id: string) => setSubs((s) => s.filter((x) => x.id !== id))
  const addProject = () => {
    const rev = parseFloat(pr) || 0
    if (!pn.trim()) return
    setProjects((p) => [
      ...p,
      { id: uid(), name: pn.trim(), revenue: rev, currency: pcur, launchDate: '' },
    ])
    setPn('')
    setPr('')
    setPcur('JPY')
  }
  const updateProj = (id: string, patch: Partial<Project>) =>
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const removeProj = (id: string) => {
    setProjects((p) => p.filter((x) => x.id !== id))
    setSubs((s) => s.map((x) => (x.projectId === id ? { ...x, projectId: '' } : x)))
  }

  /* ----- billing: 買い切り Payment Link ----- */
  // Send the user to the hosted Stripe Payment Link. client_reference_id carries
  // the Supabase user id so the webhook knows whose plan to flip after payment.
  const startCheckout = () => {
    if (!paymentLink) return
    setBillingBusy(true)
    const url = new URL(paymentLink)
    url.searchParams.set('client_reference_id', userId)
    if (email) url.searchParams.set('prefilled_email', email)
    window.location.href = url.toString()
  }
  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  /* 連携: Stripe MRR (Pro) */
  const importMRR = async () => {
    if (!isPro) return startCheckout()
    setStripeState('loading')
    setStripeMsg('')
    try {
      const res = await fetch('/api/import/stripe', { method: 'POST' })
      if (res.status === 402) {
        setStripeState('idle')
        return startCheckout()
      }
      if (!res.ok) throw new Error('import')
      const { data } = (await res.json()) as { data: StripeMrr }
      const cur = data.currency
      const amt = Number(data.mrr) || 0
      setProjects((ps) => {
        const i = ps.findIndex((p) => p.name === 'Stripe MRR')
        if (i >= 0) {
          const c = [...ps]
          c[i] = { ...c[i], revenue: amt, currency: cur }
          return c
        }
        return [...ps, { id: uid(), name: 'Stripe MRR', revenue: amt, currency: cur, launchDate: '' }]
      })
      setStripeState('ok')
      setStripeMsg(
        `Stripeから取り込んだ：MRR ${cur === 'JPY' ? '¥' : cur === 'EUR' ? '€' : '$'}${amt}（アクティブ ${data.count ?? '?'}件）`,
      )
    } catch {
      setStripeState('err')
      setStripeMsg('Stripeから取り込めへんかった。接続状況をチェックするか、収益源を手動で入れてな。')
    }
  }

  /* 連携: Gmail 請求抽出 (Pro) */
  const importGmail = async () => {
    if (!isPro) return startCheckout()
    setGmailState('loading')
    setGmailMsg('')
    try {
      const res = await fetch('/api/import/gmail', { method: 'POST' })
      if (res.status === 402) {
        setGmailState('idle')
        return startCheckout()
      }
      if (!res.ok) throw new Error('import')
      const { data } = (await res.json()) as { data: GmailHit[] }
      const clean = (Array.isArray(data) ? data : []).map((x) => ({ ...x, _on: true }))
      if (clean.length === 0) {
        setGmailState('err')
        setGmailMsg('請求メールが見つからへんかった。手動で追加してな。')
        return
      }
      setGmailFound(clean)
      setGmailState('preview')
    } catch {
      setGmailState('err')
      setGmailMsg('Gmailから取り込めへんかった。接続状況をチェックするか、手動で追加してな。')
    }
  }
  const addGmailSelected = () => {
    const picked = gmailFound.filter((x) => x._on)
    setSubs((s) => [
      ...s,
      ...picked.map((x) => ({
        id: uid(),
        name: x.name,
        amount: x.amount,
        currency: x.currency,
        cycle: x.cycle,
        category: 'AI / 汎用',
        usage: 'mid' as const,
        billingDate: '',
        projectId: '',
        account: '',
      })),
    ])
    setGmailState('idle')
    setGmailFound([])
    setGmailMsg(`${picked.length}件を追加した。金額・カテゴリは必要なら各行で直してな。`)
  }

  const curLabel = (s: Sub) => {
    const sym = s.currency === 'USD' ? '$' : s.currency === 'EUR' ? '€' : '¥'
    const num = s.currency === 'JPY' ? s.amount.toLocaleString('ja-JP') : s.amount
    return `${sym}${num}/${s.cycle === 'yearly' ? '年' : '月'}`
  }

  const download = (content: string, name: string, type: string) => {
    try {
      const blob = new Blob([content], { type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      /* noop */
    }
  }
  const exportJSON = () =>
    download(
      JSON.stringify({ subs, projects, usd, eur, cash, tax }, null, 2),
      'burn-backup.json',
      'application/json',
    )
  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ['サービス名', '勘定科目', 'カテゴリ', '通貨', '金額', 'サイクル', '月額(円)', '年額(円)'],
    ]
    subs.forEach((s) => {
      const m = monthly(s)
      rows.push([
        s.name,
        s.account || '未設定',
        s.category || '',
        s.currency,
        s.amount,
        s.cycle === 'yearly' ? '年' : '月',
        Math.round(m),
        Math.round(m * 12),
      ])
    })
    download(
      '﻿' +
        rows
          .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
          .join('\n'),
      'burn-keihi.csv',
      'text/csv',
    )
  }
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result))
        if (Array.isArray(d.subs)) setSubs(d.subs)
        if (Array.isArray(d.projects)) setProjects(d.projects)
        if (d.usd != null) setUsd(d.usd)
        if (d.eur != null) setEur(d.eur)
        if (d.cash != null) setCash(d.cash)
        if (d.tax != null) setTax(d.tax)
      } catch {
        /* noop */
      }
    }
    r.readAsText(f)
    e.target.value = ''
  }

  const legend = sorted.slice(0, 5)
  const otherTotal = sorted.slice(5).reduce((s, x) => s + monthly(x), 0)
  const covPct = Math.round(coverage * 100)
  const status = !hasRev ? null : coverage >= 1 ? 'green' : coverage > 0 ? 'amber' : 'red'

  return (
    <div className="burn">
      <style>{CSS}</style>
      <div className="burn-wrap">
        <div className="burn-top">
          <div className="burn-logo">
            <span className="burn-mark">BURN</span>
            <span className="burn-sub">ひとりスタートアップの燃焼率</span>
          </div>
          <div className="burn-acct">
            {isPro ? (
              <span className="burn-plan pro">PRO</span>
            ) : (
              <button className="burn-plan free" onClick={startCheckout} disabled={billingBusy}>
                ⚡ Proにする
              </button>
            )}
            <button className="burn-gear" onClick={() => setShowSet((v) => !v)}>
              ⚙ 設定
            </button>
          </div>
        </div>

        {showSet && (
          <div className="burn-panel">
            {email && (
              <div className="burn-panel-row">
                <span>アカウント</span>
                <span className="burn-acct-email">{email}</span>
              </div>
            )}
            <div className="burn-panel-row">
              <span>プラン</span>
              <span>
                {isPro ? (
                  <b className="g">Pro（買い切り・購入済み）</b>
                ) : (
                  <button className="burn-fbtn" onClick={startCheckout} disabled={billingBusy}>
                    Pro を購入（買い切り）
                  </button>
                )}
              </span>
            </div>
            <div className="burn-divide" />
            <div className="burn-panel-row">
              <span>米ドル → 円</span>
              <span>
                $1 ={' '}
                <input
                  className="burn-in amt"
                  type="number"
                  value={usd}
                  onChange={(e) => setUsd(parseFloat(e.target.value) || 0)}
                />{' '}
                円
              </span>
            </div>
            <div className="burn-panel-row">
              <span>ユーロ → 円</span>
              <span>
                €1 ={' '}
                <input
                  className="burn-in amt"
                  type="number"
                  value={eur}
                  onChange={(e) => setEur(parseFloat(e.target.value) || 0)}
                />{' '}
                円
              </span>
            </div>
            <div className="burn-divide" />
            <div className="burn-panel-row">
              <span>手元資金（ランウェイ計算用）</span>
              <span>
                <input
                  className="burn-in amt"
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(parseFloat(e.target.value) || 0)}
                />{' '}
                円
              </span>
            </div>
            <div className="burn-panel-row">
              <span>想定税率（節税計算用）</span>
              <span>
                <input
                  className="burn-in amt"
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                />{' '}
                %
              </span>
            </div>
            <div className="burn-note">
              為替・税率は手動。最新レートは検索で確認してな。税率は所得税+住民税のざっくり概算用で、税務アドバイスやないで。
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="burn-fbtn" onClick={logout}>
                ログアウト
              </button>
            </div>
          </div>
        )}

        {/* hero */}
        <div className="burn-hero">
          {subs.length === 0 ? (
            <>
              <div className="burn-eyebrow">今月、燃えている</div>
              <div className="burn-amt">¥0</div>
              <div className="burn-empty" style={{ paddingTop: 18 }}>
                <b>まだ何も燃やしてない 🔥</b>
                <small>下のプリセットから、課金してるやつをタップ。</small>
              </div>
            </>
          ) : !hasRev ? (
            <>
              <div className="burn-eyebrow">今月、燃えている</div>
              <div className="burn-amt burn-amt-anim">
                {yen(toolBurn)}
                <span className="burn-amt-unit">/月</span>
              </div>
              <div className="burn-stats">
                <div className="burn-stat">
                  <span className="burn-stat-n">{yen(toolBurn * 12)}</span>
                  <span className="burn-stat-l">年間で消える</span>
                </div>
                <div className="burn-stat">
                  <span className="burn-stat-n">{yen((toolBurn * 12) / 365)}</span>
                  <span className="burn-stat-l">1日あたり</span>
                </div>
                <div className="burn-stat">
                  <span className="burn-stat-n">{subs.length}</span>
                  <span className="burn-stat-l">契約数</span>
                </div>
              </div>
              <div className="burn-cta">
                ↓ <b>収益源を追加</b>すると、ランウェイと黒字判定が出る
              </div>
            </>
          ) : (
            <>
              <div className="burn-eyebrow">{netBurn > 0 ? '実質 burn ・ 月' : '今月の黒字 ・ 月'}</div>
              <div className={`burn-amt ${netBurn > 0 ? 'burn-amt-anim' : 'profit'}`}>
                {netBurn > 0 ? yen(netBurn) : '+' + yen(-netBurn)}
                <span className="burn-amt-unit">/月</span>
              </div>
              <div className="burn-cover">
                <div className="burn-cover-fill" style={{ width: `${Math.min(coverage, 1) * 100}%` }} />
              </div>
              <div style={{ marginBottom: 4 }}>
                {status === 'green' && (
                  <span className="burn-status green">🟢 黒字 — ツール代を回収できてる</span>
                )}
                {status === 'amber' && (
                  <span className="burn-status amber">
                    🟠 一部回収 — プロダクトがツール代の{covPct}%を稼いでる
                  </span>
                )}
                {status === 'red' && <span className="burn-status red">🔴 全額持ち出し — 収益ゼロ</span>}
              </div>
              <div className="burn-stats">
                <div className="burn-stat">
                  <span className="burn-stat-n">{yen(toolBurn)}</span>
                  <span className="burn-stat-l">ツール burn</span>
                </div>
                <div className="burn-stat">
                  <span className="burn-stat-n g">{yen(totalRev)}</span>
                  <span className="burn-stat-l">収益</span>
                </div>
                <div className="burn-stat">
                  <span className="burn-stat-n">{covPct}%</span>
                  <span className="burn-stat-l">カバー率</span>
                </div>
                {runway != null ? (
                  <div className="burn-stat">
                    <span className="burn-stat-n">{runway >= 100 ? '99+' : runway.toFixed(1)}</span>
                    <span className="burn-stat-l">ランウェイ(月)</span>
                  </div>
                ) : netBurn <= 0 ? (
                  <div className="burn-stat">
                    <span className="burn-stat-n g">∞</span>
                    <span className="burn-stat-l">ランウェイ</span>
                  </div>
                ) : (
                  <div className="burn-stat">
                    <span className="burn-stat-n">{subs.length}</span>
                    <span className="burn-stat-l">契約数</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 次に燃える */}
        {upcoming.length > 0 && (
          <>
            <h2 className="burn-h">次に燃える</h2>
            <div className="burn-next">
              {upcoming.map(({ s, n }) => (
                <div key={s.id} className={`burn-next-item ${n.days <= 3 ? 'urgent' : ''}`}>
                  <span className="burn-next-when">{daysLabel(n.days)}</span>
                  <span className="burn-next-name">{s.name}</span>
                  <span className="burn-next-yen">{yen(monthly(s))}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 解約候補 */}
        {dead.length > 0 && (
          <div className="burn-warn">
            <span className="burn-warn-ico">💸</span>
            <span className="burn-warn-tx">
              「使ってない」が <b>{dead.length}件</b>。解約すれば毎月 {yen(deadMonthly)} 浮く。
            </span>
            <span className="burn-warn-amt">
              {yen(deadMonthly * 12)}
              <small>年間 節約</small>
            </span>
          </div>
        )}

        {/* プロダクト / 収益源 */}
        <h2 className="burn-h">プロダクト / 収益源</h2>
        <div className="burn-sync-row">
          <button className="burn-sync stripe" onClick={importMRR} disabled={stripeState === 'loading'}>
            {stripeState === 'loading' ? <span className="burn-spin" /> : '⚡'} StripeからMRRを取り込む
            {!isPro && <span className="burn-lock">PRO</span>}
          </button>
        </div>
        {stripeMsg && (
          <div
            className={`burn-msg ${stripeState === 'ok' ? 'ok' : 'err'}`}
            style={{ marginTop: -4, marginBottom: 12 }}
          >
            {stripeMsg}
          </div>
        )}
        {projects.length > 0 && (
          <div className="burn-projs">
            {projects.map((p) => {
              const rev = projRev(p)
              const cost = projCost(p.id)
              const net = rev - cost
              const ds = daysSince(p.launchDate)
              const r = roast(net, ds)
              return (
                <div key={p.id} className="burn-proj">
                  <div
                    className="burn-proj-main"
                    onClick={() => setEditPid(editPid === p.id ? null : p.id)}
                  >
                    <div className="burn-proj-info">
                      <b>{p.name}</b>
                      <small>
                        収益 {yen(rev)}/月 ・ ツール {yen(cost)}/月
                      </small>
                      {r && (
                        <div>
                          <span className={`burn-roast ${r.cls}`}>{r.t}</span>
                        </div>
                      )}
                    </div>
                    <div className={`burn-proj-net ${net >= 0 ? 'g' : 'r'}`}>
                      {net >= 0 ? '+' + yen(net) : yen(net)}
                      <small>{net >= 0 ? '黒字/月' : '赤字/月'}</small>
                    </div>
                    <button
                      className="burn-x"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeProj(p.id)
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {editPid === p.id && (
                    <div className="burn-edit">
                      <div className="burn-edit-row">
                        <input
                          className="burn-in name"
                          value={p.name}
                          onChange={(e) => updateProj(p.id, { name: e.target.value })}
                        />
                        <input
                          className="burn-in amt"
                          type="number"
                          value={p.revenue}
                          onChange={(e) =>
                            updateProj(p.id, { revenue: parseFloat(e.target.value) || 0 })
                          }
                        />
                        <div className="burn-seg">
                          {(['USD', 'JPY', 'EUR'] as Currency[]).map((c) => (
                            <button
                              key={c}
                              className={p.currency === c ? 'on' : ''}
                              onClick={() => updateProj(p.id, { currency: c })}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="burn-edit-row">
                        <span className="burn-edit-lbl">ローンチ日（「Day N・赤字」の煽り用）</span>
                        <input
                          className="burn-in"
                          type="date"
                          value={p.launchDate || ''}
                          onChange={(e) => updateProj(p.id, { launchDate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div className="burn-form">
          <input
            className="burn-in name"
            placeholder="プロダクト名（例: 自作SaaS）"
            value={pn}
            onChange={(e) => setPn(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addProject()}
          />
          <input
            className="burn-in amt"
            type="number"
            placeholder="月収益"
            value={pr}
            onChange={(e) => setPr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addProject()}
          />
          <div className="burn-seg">
            {(['USD', 'JPY', 'EUR'] as Currency[]).map((c) => (
              <button key={c} className={pcur === c ? 'on' : ''} onClick={() => setPcur(c)}>
                {c}
              </button>
            ))}
          </div>
          <button className="burn-add green" onClick={addProject} disabled={!pn.trim()}>
            収益源を追加
          </button>
        </div>

        {/* 内訳 */}
        {subs.length > 0 && (
          <>
            <div className="burn-bar-head">
              <h2 className="burn-h" style={{ margin: 0 }}>
                ツールの内訳
              </h2>
              <div className="burn-seg sm">
                <button className={view === 'service' ? 'on' : ''} onClick={() => setView('service')}>
                  サービス別
                </button>
                <button
                  className={view === 'category' ? 'on' : ''}
                  onClick={() => setView('category')}
                >
                  カテゴリ別
                </button>
              </div>
            </div>
            {view === 'service' ? (
              <>
                <div className="burn-meter">
                  {sorted.map((s) => (
                    <div
                      key={s.id}
                      className="burn-meter-seg"
                      style={{ width: `${(monthly(s) / toolBurn) * 100}%`, background: colorFor(s.id) }}
                    />
                  ))}
                </div>
                <div className="burn-legend">
                  {legend.map((s) => (
                    <span key={s.id} className="burn-leg">
                      <i style={{ background: colorFor(s.id) }} />
                      {s.name} <b>{Math.round((monthly(s) / toolBurn) * 100)}%</b>
                    </span>
                  ))}
                  {otherTotal > 0 && (
                    <span className="burn-leg">
                      <i style={{ background: 'var(--faint)' }} />
                      その他 <b>{Math.round((otherTotal / toolBurn) * 100)}%</b>
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="burn-meter">
                  {catData.map((c) => (
                    <div
                      key={c.name}
                      className="burn-meter-seg"
                      style={{ width: `${(c.val / toolBurn) * 100}%`, background: catColor(c.name) }}
                    />
                  ))}
                </div>
                <div className="burn-legend">
                  {catData.map((c) => (
                    <span key={c.name} className="burn-leg">
                      <i style={{ background: catColor(c.name) }} />
                      {c.name} <b>{yen(c.val)}</b>
                    </span>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ツール追加 */}
        <h2 className="burn-h">ツールを追加</h2>
        <div className="burn-sync-row">
          <button className="burn-sync" onClick={importGmail} disabled={gmailState === 'loading'}>
            {gmailState === 'loading' ? <span className="burn-spin" /> : '📧'} Gmailから請求を検索
            {!isPro && <span className="burn-lock">PRO</span>}
          </button>
        </div>
        {gmailMsg && (
          <div
            className={`burn-msg ${gmailState === 'err' ? 'err' : 'ok'}`}
            style={{ marginTop: -4, marginBottom: 12 }}
          >
            {gmailMsg}
          </div>
        )}
        {gmailState === 'preview' && (
          <div className="burn-prev">
            <div className="burn-prev-head">
              <b>見つかった請求（{gmailFound.filter((x) => x._on).length}件 選択中）</b>
              <small>タップで選択切替</small>
            </div>
            {gmailFound.map((x, i) => (
              <div
                key={i}
                className="burn-prev-item"
                onClick={() =>
                  setGmailFound((arr) => arr.map((y, j) => (j === i ? { ...y, _on: !y._on } : y)))
                }
              >
                <span className={`burn-prev-check ${x._on ? 'on' : ''}`}>{x._on ? '✓' : ''}</span>
                <span className="burn-prev-name">{x.name}</span>
                <span className="burn-prev-amt">
                  {x.currency === 'JPY' ? '¥' : x.currency === 'EUR' ? '€' : '$'}
                  {x.amount}/{x.cycle === 'yearly' ? '年' : '月'}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
              <button
                className="burn-add"
                onClick={addGmailSelected}
                disabled={gmailFound.filter((x) => x._on).length === 0}
              >
                選択した{gmailFound.filter((x) => x._on).length}件を追加
              </button>
              <button
                className="burn-fbtn"
                onClick={() => {
                  setGmailState('idle')
                  setGmailFound([])
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
        <div className="burn-chips">
          {PRESETS.map((p) => (
            <button key={p.name} className="burn-chip" onClick={() => addPreset(p)}>
              + {p.name}
              <span>${p.amount}</span>
            </button>
          ))}
        </div>
        <div className="burn-form">
          <input
            className="burn-in name"
            placeholder="その他のサービス名"
            value={cn}
            onChange={(e) => setCn(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          />
          <input
            className="burn-in amt"
            type="number"
            placeholder="金額"
            value={ca}
            onChange={(e) => setCa(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          />
          <div className="burn-seg">
            {(['USD', 'JPY', 'EUR'] as Currency[]).map((c) => (
              <button key={c} className={cc === c ? 'on' : ''} onClick={() => setCc(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="burn-seg">
            <button className={ccy === 'monthly' ? 'on' : ''} onClick={() => setCcy('monthly')}>
              月
            </button>
            <button className={ccy === 'yearly' ? 'on' : ''} onClick={() => setCcy('yearly')}>
              年
            </button>
          </div>
          <select className="burn-in" value={ccat} onChange={(e) => setCcat(e.target.value)}>
            {CATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {projects.length > 0 && (
            <select className="burn-in" value={cproj} onChange={(e) => setCproj(e.target.value)}>
              <option value="">紐付けなし</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button className="burn-add" onClick={addCustom} disabled={!cn.trim() || !(parseFloat(ca) > 0)}>
            追加
          </button>
        </div>

        {/* リスト */}
        {subs.length > 0 && (
          <>
            <h2 className="burn-h">契約中（{subs.length}）</h2>
            <div className="burn-list">
              {sorted.map((s) => {
                const n = nextCharge(s)
                const pname = projName(s.projectId)
                return (
                  <div key={s.id} className={`burn-row ${s.usage === 'low' ? 'dead' : ''}`}>
                    <div
                      className="burn-row-main"
                      onClick={() => setEditId(editId === s.id ? null : s.id)}
                    >
                      <span className="burn-dot" style={{ background: colorFor(s.id) }} />
                      <div className="burn-row-name">
                        <b>{s.name}</b>
                        <div className="burn-meta">
                          <span className="burn-mono">{curLabel(s)}</span>
                          {s.category && <span className="burn-tag">{s.category}</span>}
                          {pname && <span className="burn-tag proj">{pname}</span>}
                          {n && (
                            <span className={`burn-badge ${n.days <= 3 ? 'soon' : 'day'}`}>
                              {daysLabel(n.days)}
                            </span>
                          )}
                          {s.usage === 'low' && <span className="burn-badge dead">使ってない</span>}
                        </div>
                      </div>
                      <div className="burn-row-yen">
                        {yen(monthly(s))}
                        <small>月あたり</small>
                      </div>
                      <button
                        className="burn-x"
                        onClick={(e) => {
                          e.stopPropagation()
                          remove(s.id)
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    {editId === s.id && (
                      <div className="burn-edit">
                        <div className="burn-edit-row">
                          <input
                            className="burn-in name"
                            value={s.name}
                            onChange={(e) => update(s.id, { name: e.target.value })}
                          />
                          <input
                            className="burn-in amt"
                            type="number"
                            value={s.amount}
                            onChange={(e) => update(s.id, { amount: parseFloat(e.target.value) || 0 })}
                          />
                          <div className="burn-seg">
                            {(['USD', 'JPY', 'EUR'] as Currency[]).map((c) => (
                              <button
                                key={c}
                                className={s.currency === c ? 'on' : ''}
                                onClick={() => update(s.id, { currency: c })}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                          <div className="burn-seg">
                            <button
                              className={s.cycle === 'monthly' ? 'on' : ''}
                              onClick={() => update(s.id, { cycle: 'monthly' })}
                            >
                              月
                            </button>
                            <button
                              className={s.cycle === 'yearly' ? 'on' : ''}
                              onClick={() => update(s.id, { cycle: 'yearly' })}
                            >
                              年
                            </button>
                          </div>
                        </div>
                        <div className="burn-edit-row">
                          <span className="burn-edit-lbl">カテゴリ / 次回課金日 / 使用頻度</span>
                          <select
                            className="burn-in"
                            value={s.category || 'その他'}
                            onChange={(e) => update(s.id, { category: e.target.value })}
                          >
                            {CATS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <input
                            className="burn-in"
                            type="date"
                            value={s.billingDate || ''}
                            onChange={(e) => update(s.id, { billingDate: e.target.value })}
                          />
                          <div className="burn-seg">
                            <button
                              className={s.usage === 'high' ? 'on' : ''}
                              onClick={() => update(s.id, { usage: 'high' })}
                            >
                              よく使う
                            </button>
                            <button
                              className={s.usage === 'mid' ? 'on' : ''}
                              onClick={() => update(s.id, { usage: 'mid' })}
                            >
                              たまに
                            </button>
                            <button
                              className={s.usage === 'low' ? 'on' : ''}
                              onClick={() => update(s.id, { usage: 'low' })}
                            >
                              使ってない
                            </button>
                          </div>
                        </div>
                        <div className="burn-edit-row">
                          <span className="burn-edit-lbl">プロダクト紐付け / 勘定科目（確定申告用）</span>
                          <select
                            className="burn-in"
                            value={s.projectId || ''}
                            onChange={(e) => update(s.id, { projectId: e.target.value })}
                          >
                            <option value="">紐付けなし</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <select
                            className="burn-in"
                            value={s.account || ''}
                            onChange={(e) => update(s.id, { account: e.target.value })}
                          >
                            <option value="">科目: 未設定</option>
                            {ACCOUNTS.map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* 経費 / 確定申告 */}
        {subs.length > 0 && (
          <div style={{ marginTop: 34 }}>
            <h2 className="burn-h">経費 / 確定申告</h2>
            <div className="burn-panel">
              <div className="burn-panel-row">
                <span>年間の事業経費（ツール合計）</span>
                <b>{yen(yearExpense)}</b>
              </div>
              <div className="burn-panel-row">
                <span>想定節税額（税率 {tax}%）</span>
                <b className="g">−{yen(taxSaving)}</b>
              </div>
              <div className="burn-divide" />
              <div className="burn-panel-row">
                <span>実質負担（節税後）</span>
                <b className="r">{yen(realCost)}</b>
              </div>
              {acctData.length > 0 && (
                <>
                  <div className="burn-divide" />
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--faint)',
                      marginBottom: 8,
                      letterSpacing: '.06em',
                    }}
                  >
                    科目別（年額）
                  </div>
                  <div className="burn-legend" style={{ marginBottom: 4 }}>
                    {acctData.map((a) => (
                      <span key={a.name} className="burn-leg">
                        <i style={{ background: a.name === '未設定' ? 'var(--faint)' : 'var(--ember)' }} />
                        {a.name} <b>{yen(a.val)}</b>
                      </span>
                    ))}
                  </div>
                </>
              )}
              <div style={{ marginTop: 12 }}>
                <button className="burn-fbtn" onClick={exportCSV}>
                  確定申告用CSVを書き出し
                </button>
              </div>
              <div className="burn-note">
                全ツールを事業経費とみなした概算。実際の勘定科目・経費割合・控除は確定申告の手引きや税理士で確認してな（税務アドバイスやないで）。
              </div>
            </div>
          </div>
        )}

        {(subs.length > 0 || projects.length > 0) && (
          <div className="burn-foot">
            <button className="burn-fbtn" onClick={exportJSON}>
              書き出し
            </button>
            <button className="burn-fbtn" onClick={() => fileRef.current && fileRef.current.click()}>
              読み込み
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={importJSON}
            />
            {confirmReset ? (
              <button
                className="burn-fbtn danger"
                onClick={() => {
                  setSubs([])
                  setProjects([])
                  setConfirmReset(false)
                }}
              >
                本当に全部消す？（もう一度）
              </button>
            ) : (
              <button className="burn-fbtn danger" onClick={() => setConfirmReset(true)}>
                すべてリセット
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=Bricolage+Grotesque:wght@400;500;600;700&display=swap');

.burn{
  --bg:#13100e; --bg2:#1b1611; --surface:#211a15; --surface2:#29211a;
  --line:#3a2e25; --line2:#4a3a2d;
  --text:#f3ece3; --dim:#a99c8c; --faint:#6f6256;
  --ember:#d9602e; --ember-hi:#f2a33c; --ember-red:#d7402a;
  --green:#6bbf9a; --green-dim:rgba(107,191,154,.14);
  --font-num:'Big Shoulders Display','Bricolage Grotesque',system-ui,sans-serif;
  --font:'Bricolage Grotesque',system-ui,-apple-system,"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif;
  font-family:var(--font); color:var(--text); color-scheme:dark;
  background:radial-gradient(120% 80% at 50% 118%, rgba(217,96,46,.13), transparent 60%), var(--bg);
  min-height:100vh; width:100%; -webkit-font-smoothing:antialiased;
}
.burn *{ box-sizing:border-box; }
.burn-wrap{ max-width:680px; margin:0 auto; padding:22px 18px 60px; }

.burn-top{ display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
.burn-logo{ display:flex; align-items:baseline; gap:9px; }
.burn-mark{ font-family:var(--font-num); font-weight:800; font-size:30px; letter-spacing:.06em;
  background:linear-gradient(100deg,var(--ember),var(--ember-hi)); -webkit-background-clip:text; background-clip:text; color:transparent; line-height:1; }
.burn-sub{ font-size:11px; color:var(--faint); letter-spacing:.02em; }
.burn-acct{ display:flex; align-items:center; gap:8px; }
.burn-plan{ font-family:var(--font); font-size:12px; font-weight:700; letter-spacing:.04em; border-radius:999px; padding:6px 12px; cursor:pointer; transition:.15s; border:1px solid transparent; }
.burn-plan.pro{ color:#1a120c; background:linear-gradient(100deg,var(--ember-hi),var(--ember)); cursor:default; }
.burn-plan.free{ color:var(--ember-hi); background:rgba(242,163,60,.1); border-color:rgba(242,163,60,.3); }
.burn-plan.free:hover{ background:rgba(242,163,60,.18); }
.burn-plan:disabled{ opacity:.6; cursor:default; }
.burn-acct-email{ font-size:12.5px; color:var(--dim); }
.burn-gear{ font-family:var(--font); font-size:12px; color:var(--dim); background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:7px 13px; cursor:pointer; transition:.15s; }
.burn-gear:hover{ border-color:var(--line2); color:var(--text); }

.burn-hero{ text-align:center; padding:12px 0 24px; }
.burn-eyebrow{ font-size:12px; letter-spacing:.22em; text-transform:uppercase; color:var(--faint); margin-bottom:6px; }
.burn-amt{ font-family:var(--font-num); font-weight:800; font-size:clamp(58px,16vw,108px); line-height:.9; letter-spacing:-.01em; font-feature-settings:"tnum" 1;
  background:linear-gradient(176deg,#ffd9a8 4%,var(--ember-hi) 38%,var(--ember) 78%,var(--ember-red) 102%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 6px 30px rgba(217,96,46,.26)); }
.burn-amt.profit{ background:linear-gradient(176deg,#cdeede 4%,var(--green) 70%,#3f9e78 104%); filter:drop-shadow(0 6px 30px rgba(107,191,154,.28)); }
.burn-amt-anim{ animation:flick 5.5s ease-in-out infinite; }
@keyframes flick{ 0%,100%{ filter:drop-shadow(0 6px 30px rgba(217,96,46,.24)); } 45%{ filter:drop-shadow(0 8px 40px rgba(242,163,60,.4)); } }
.burn-amt-unit{ font-size:.32em; color:var(--dim); -webkit-text-fill-color:var(--dim); font-weight:600; margin-left:6px; }
.burn-stats{ display:flex; justify-content:center; gap:22px; margin-top:16px; flex-wrap:wrap; }
.burn-stat{ display:flex; flex-direction:column; align-items:center; }
.burn-stat-n{ font-family:var(--font-num); font-weight:700; font-size:21px; color:var(--text); font-feature-settings:"tnum" 1; }
.burn-stat-n.g{ color:var(--green); }
.burn-stat-l{ font-size:11px; color:var(--faint); letter-spacing:.06em; margin-top:1px; }

.burn-cover{ height:11px; border-radius:6px; overflow:hidden; margin:20px 0 10px; background:rgba(217,96,46,.22); border:1px solid var(--line); }
.burn-cover-fill{ height:100%; background:linear-gradient(90deg,#3f9e78,var(--green)); transition:width .5s ease; }
.burn-status{ display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; border-radius:999px; padding:5px 13px; }
.burn-status.red{ color:var(--ember-red); background:rgba(215,64,42,.12); border:1px solid rgba(215,64,42,.3); }
.burn-status.amber{ color:var(--ember-hi); background:rgba(242,163,60,.12); border:1px solid rgba(242,163,60,.3); }
.burn-status.green{ color:var(--green); background:var(--green-dim); border:1px solid rgba(107,191,154,.35); }
.burn-cta{ font-size:13px; color:var(--faint); margin-top:14px; } .burn-cta b{ color:var(--ember-hi); font-weight:600; }

.burn-h{ font-size:12px; letter-spacing:.18em; text-transform:uppercase; color:var(--faint); margin:0 0 13px; font-weight:600; }
.burn-bar-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:13px; gap:10px; }

.burn-next{ display:flex; flex-direction:column; gap:7px; margin-bottom:28px; }
.burn-next-item{ display:flex; align-items:center; gap:11px; background:var(--surface); border:1px solid var(--line); border-radius:11px; padding:11px 13px; }
.burn-next-item.urgent{ border-color:rgba(215,64,42,.5); background:linear-gradient(90deg,rgba(215,64,42,.1),var(--surface) 60%); }
.burn-next-when{ font-family:var(--font-num); font-weight:700; font-size:16px; min-width:54px; color:var(--ember-hi); font-feature-settings:"tnum" 1; }
.burn-next-item.urgent .burn-next-when{ color:var(--ember-red); }
.burn-next-name{ flex:1; font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.burn-next-yen{ font-family:var(--font-num); font-weight:700; font-size:17px; color:var(--text); font-feature-settings:"tnum" 1; }
.burn-warn{ display:flex; align-items:center; gap:12px; background:linear-gradient(100deg,rgba(215,64,42,.16),rgba(217,96,46,.06)); border:1px solid rgba(215,64,42,.4); border-radius:13px; padding:14px 15px; margin-bottom:28px; }
.burn-warn-ico{ font-size:22px; } .burn-warn-tx{ flex:1; font-size:13.5px; line-height:1.4; } .burn-warn-tx b{ color:var(--ember-hi); font-weight:700; }
.burn-warn-amt{ font-family:var(--font-num); font-weight:800; font-size:24px; color:var(--ember-red); font-feature-settings:"tnum" 1; text-align:right; line-height:1; }
.burn-warn-amt small{ display:block; font-size:10px; color:var(--dim); font-weight:500; letter-spacing:.05em; }

.burn-seg{ display:flex; background:var(--bg2); border:1px solid var(--line); border-radius:9px; overflow:hidden; }
.burn-seg button{ font-family:var(--font); font-size:13px; color:var(--dim); background:transparent; border:0; padding:8px 13px; cursor:pointer; transition:.12s; white-space:nowrap; }
.burn-seg button.on{ background:var(--surface2); color:var(--text); } .burn-seg.sm button{ padding:6px 9px; font-size:12px; }
.burn-meter{ display:flex; height:13px; border-radius:7px; overflow:hidden; margin-bottom:11px; background:var(--surface); border:1px solid var(--line); }
.burn-meter-seg{ height:100%; transition:width .4s ease; }
.burn-legend{ display:flex; flex-wrap:wrap; gap:5px 16px; margin-bottom:32px; }
.burn-leg{ display:flex; align-items:center; gap:7px; font-size:12px; color:var(--dim); } .burn-leg i{ width:9px; height:9px; border-radius:2px; display:inline-block; } .burn-leg b{ color:var(--text); font-weight:500; }

/* sync (連携) */
.burn-sync{ display:flex; align-items:center; gap:8px; font-family:var(--font); font-size:13px; font-weight:500; color:var(--text); background:var(--surface); border:1px solid var(--line2); border-radius:10px; padding:10px 14px; cursor:pointer; transition:.14s; }
.burn-sync:hover{ border-color:var(--ember); background:var(--surface2); }
.burn-sync:disabled{ opacity:.55; cursor:default; }
.burn-sync.stripe:hover{ border-color:var(--green); }
.burn-lock{ font-size:9.5px; font-weight:700; letter-spacing:.06em; color:#1a120c; background:var(--ember-hi); border-radius:4px; padding:1px 5px; margin-left:2px; }
.burn-spin{ width:14px; height:14px; border:2px solid var(--faint); border-top-color:var(--ember); border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin{ to{ transform:rotate(360deg); } }
.burn-msg{ font-size:12.5px; margin:10px 2px 0; line-height:1.5; }
.burn-msg.ok{ color:var(--green); } .burn-msg.err{ color:var(--ember-red); }
.burn-sync-row{ display:flex; gap:9px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }

/* gmail preview */
.burn-prev{ background:var(--surface); border:1px solid var(--line2); border-radius:13px; padding:13px; margin-bottom:16px; }
.burn-prev-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; }
.burn-prev-head b{ font-size:13px; } .burn-prev-head small{ font-size:11.5px; color:var(--faint); }
.burn-prev-item{ display:flex; align-items:center; gap:11px; padding:9px 4px; border-top:1px solid var(--line); cursor:pointer; }
.burn-prev-check{ width:18px; height:18px; border-radius:5px; border:1.5px solid var(--line2); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:12px; color:#1a120c; }
.burn-prev-check.on{ background:var(--ember-hi); border-color:var(--ember-hi); }
.burn-prev-name{ flex:1; font-size:14px; font-weight:500; }
.burn-prev-amt{ font-family:var(--font-num); font-weight:700; font-size:16px; font-feature-settings:"tnum" 1; }

/* projects */
.burn-projs{ display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
.burn-proj{ background:var(--surface); border:1px solid var(--line); border-radius:13px; overflow:hidden; }
.burn-proj-main{ display:flex; align-items:flex-start; gap:13px; padding:13px 14px; cursor:pointer; }
.burn-proj-info{ flex:1; min-width:0; }
.burn-proj-info b{ font-weight:600; font-size:15px; display:block; margin-bottom:3px; }
.burn-proj-info small{ font-size:12px; color:var(--faint); }
.burn-roast{ display:inline-block; font-size:11px; font-weight:600; border-radius:5px; padding:2px 8px; margin-top:6px; }
.burn-roast.r{ color:var(--ember-red); background:rgba(215,64,42,.12); border:1px solid rgba(215,64,42,.3); }
.burn-roast.a{ color:var(--ember-hi); background:rgba(242,163,60,.12); border:1px solid rgba(242,163,60,.25); }
.burn-roast.g{ color:var(--green); background:var(--green-dim); border:1px solid rgba(107,191,154,.3); }
.burn-roast.d{ color:var(--dim); background:var(--bg2); border:1px solid var(--line); }
.burn-proj-net{ font-family:var(--font-num); font-weight:700; font-size:20px; font-feature-settings:"tnum" 1; text-align:right; white-space:nowrap; }
.burn-proj-net.g{ color:var(--green); } .burn-proj-net.r{ color:var(--ember-red); }
.burn-proj-net small{ display:block; font-size:10px; color:var(--faint); font-weight:500; letter-spacing:.04em; }

.burn-form{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; background:var(--surface); border:1px solid var(--line); border-radius:13px; padding:11px; margin-bottom:34px; }
.burn-in{ font-family:var(--font); font-size:14px; color:var(--text); background:var(--bg2); border:1px solid var(--line); border-radius:9px; padding:9px 11px; outline:none; transition:.14s; }
.burn-in:focus{ border-color:var(--ember); }
.burn-in.name{ flex:1 1 130px; min-width:120px; } .burn-in.amt{ width:90px; text-align:right; font-family:var(--font-num); font-weight:600; }
select.burn-in{ cursor:pointer; }
.burn-add{ font-family:var(--font); font-size:14px; font-weight:600; color:#1a120c; background:linear-gradient(100deg,var(--ember-hi),var(--ember)); border:0; border-radius:9px; padding:9px 16px; cursor:pointer; transition:.14s; }
.burn-add:hover{ filter:brightness(1.07); } .burn-add:disabled{ opacity:.4; cursor:default; filter:none; }
.burn-add.green{ background:linear-gradient(100deg,var(--green),#3f9e78); color:#0d1813; }

.burn-chips{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
.burn-chip{ font-family:var(--font); font-size:13px; color:var(--text); background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:7px 13px; cursor:pointer; transition:.14s; white-space:nowrap; }
.burn-chip:hover{ border-color:var(--ember); background:var(--surface2); } .burn-chip span{ color:var(--faint); margin-left:5px; font-size:12px; }

.burn-list{ display:flex; flex-direction:column; gap:8px; }
.burn-row{ background:var(--surface); border:1px solid var(--line); border-radius:13px; overflow:hidden; transition:.15s; }
.burn-row.dead{ border-color:rgba(215,64,42,.35); opacity:.82; }
.burn-row-main{ display:flex; align-items:flex-start; gap:13px; padding:13px 14px; cursor:pointer; }
.burn-dot{ width:10px; height:10px; border-radius:3px; flex-shrink:0; margin-top:3px; }
.burn-row-name{ flex:1; min-width:0; }
.burn-row-name b{ font-weight:600; font-size:15px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px; }
.burn-meta{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
.burn-mono{ font-size:12px; color:var(--faint); }
.burn-tag{ font-size:10.5px; color:var(--dim); background:var(--bg2); border:1px solid var(--line); border-radius:5px; padding:1px 7px; }
.burn-tag.proj{ color:var(--green); border-color:rgba(107,191,154,.3); background:var(--green-dim); }
.burn-badge{ font-size:10.5px; font-weight:600; border-radius:5px; padding:1px 7px; letter-spacing:.02em; }
.burn-badge.soon{ color:#1a120c; background:var(--ember-hi); } .burn-badge.day{ color:var(--ember-hi); background:rgba(242,163,60,.12); border:1px solid rgba(242,163,60,.25); }
.burn-badge.dead{ color:var(--ember-red); background:rgba(215,64,42,.12); border:1px solid rgba(215,64,42,.3); }
.burn-row-yen{ font-family:var(--font-num); font-weight:700; font-size:20px; color:var(--text); font-feature-settings:"tnum" 1; text-align:right; white-space:nowrap; }
.burn-row-yen small{ display:block; font-size:10.5px; color:var(--faint); font-weight:500; letter-spacing:.04em; }
.burn-x{ background:transparent; border:0; color:var(--faint); cursor:pointer; font-size:17px; padding:4px 6px; border-radius:7px; transition:.14s; flex-shrink:0; line-height:1; }
.burn-x:hover{ color:var(--ember-red); background:rgba(215,64,42,.1); }

.burn-edit{ border-top:1px solid var(--line); padding:12px 14px; background:var(--bg2); }
.burn-edit-row{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; } .burn-edit-row + .burn-edit-row{ margin-top:9px; }
.burn-edit-lbl{ font-size:11px; color:var(--faint); width:100%; margin-bottom:-3px; letter-spacing:.06em; }

.burn-empty{ text-align:center; padding:28px 16px 4px; color:var(--dim); }
.burn-empty b{ display:block; color:var(--text); font-size:16px; margin-bottom:5px; font-weight:600; } .burn-empty small{ font-size:13px; color:var(--faint); }

.burn-panel{ background:var(--surface); border:1px solid var(--line); border-radius:13px; padding:14px; margin-bottom:30px; }
.burn-panel-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin:9px 0; }
.burn-panel-row span{ font-size:13px; color:var(--dim); }
.burn-panel-row b{ font-family:var(--font-num); font-weight:700; font-size:18px; font-feature-settings:"tnum" 1; }
.burn-panel-row b.r{ color:var(--ember-red); } .burn-panel-row b.g{ color:var(--green); }
.burn-divide{ height:1px; background:var(--line); margin:11px 0; }
.burn-note{ font-size:11.5px; color:var(--faint); margin-top:10px; line-height:1.5; }
.burn-foot{ display:flex; justify-content:center; gap:9px; margin-top:34px; flex-wrap:wrap; }
.burn-fbtn{ font-family:var(--font); font-size:12px; color:var(--faint); background:transparent; border:1px solid var(--line); border-radius:999px; padding:7px 15px; cursor:pointer; transition:.14s; }
.burn-fbtn:hover{ color:var(--text); border-color:var(--line2); } .burn-fbtn.danger:hover{ color:var(--ember-red); border-color:var(--ember-red); }

@media (prefers-reduced-motion: reduce){ .burn-amt-anim{ animation:none; } .burn-meter-seg,.burn-cover-fill{ transition:none; } .burn-spin{ animation-duration:1.4s; } }
@media (max-width:480px){ .burn-stats{ gap:16px; } .burn-wrap{ padding:18px 14px 50px; } .burn-in.name{ flex-basis:100%; } }
`
