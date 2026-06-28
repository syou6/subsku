import Link from 'next/link'
import { getSession } from '@/lib/auth'
import styles from './landing.module.css'

export default async function LandingPage() {
  const session = await getSession()

  return (
    <main className={styles.page}>
      <div className={styles.glow} />
      <nav className={styles.nav}>
        <span className={styles.mark}>BURN</span>
        <div className={styles.navRight}>
          {session ? (
            <Link href="/app" className={styles.cta}>
              ダッシュボード →
            </Link>
          ) : (
            <Link href="/login" className={styles.login}>
              ログイン
            </Link>
          )}
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.eyebrow}>ひとりスタートアップの燃焼率</div>
        <h1 className={styles.h1}>
          毎月、いくら
          <br />
          <span className={styles.fire}>燃やしてる？</span>
        </h1>
        <p className={styles.lede}>
          ChatGPT、Claude、Cursor、Vercel……増え続けるAIツールの月額をまとめて、
          <b>バーンレート</b>・<b>ランウェイ</b>・<b>黒字化までの距離</b>を一目で。
          GmailとStripeからの自動取り込みで、入力ゼロから始まる。
        </p>
        <div className={styles.actions}>
          <Link href={session ? '/app' : '/login'} className={styles.primary}>
            {session ? 'ダッシュボードを開く' : '無料で始める'}
          </Link>
          <Link href="/login" className={styles.secondary}>
            ログイン
          </Link>
        </div>
        <div className={styles.note}>クレカ不要・無料プランあり</div>
      </section>

      <section className={styles.features}>
        <div className={styles.card}>
          <div className={styles.cardIco}>🔥</div>
          <h3>燃焼率を可視化</h3>
          <p>月額・年額・1日あたり。サービス別／カテゴリ別の内訳まで、燃えている額がすぐ分かる。</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIco}>📈</div>
          <h3>黒字化までの距離</h3>
          <p>プロダクトの収益を足せば、カバー率・ランウェイ・「Day N・赤字」の現実が見える。</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIco}>⚡</div>
          <h3>
            自動取り込み <span className={styles.pro}>PRO</span>
          </h3>
          <p>Gmailの請求メールとStripeのMRRを自動で取り込み。手入力の手間をまるごと削減。</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIco}>🧾</div>
          <h3>確定申告にも</h3>
          <p>勘定科目を割り当てて、年額・想定節税額を集計。経費CSVをそのまま書き出し。</p>
        </div>
      </section>

      <footer className={styles.foot}>
        <span className={styles.mark}>BURN</span>
        <span>© {new Date().getFullYear()} Burn</span>
      </footer>
    </main>
  )
}
