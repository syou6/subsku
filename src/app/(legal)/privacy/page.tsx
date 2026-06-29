import Link from 'next/link'
import type { Metadata } from 'next'
import styles from '../legal.module.css'

export const metadata: Metadata = {
  title: 'プライバシーポリシー | Burn',
}

// プライバシーポリシー。Stripe 審査・Google OAuth / Gmail API 審査でも掲示が必須。
// 第三者処理（Anthropic への送信）を含め、実際のデータの流れを正直に開示している。
export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.mark}>
          BURN
        </Link>
        <Link href="/" className={styles.back}>
          ← トップへ
        </Link>
      </nav>

      <div className={styles.wrap}>
        <h1 className={styles.h1}>プライバシーポリシー</h1>
        <p className={styles.updated}>最終更新日：2026年6月28日</p>

        <div className={styles.body}>
          <p>
            合同会社AMOR（以下「当社」）は、当社が提供するサービス「Burn」（以下「本サービス」）における、
            利用者の個人情報および利用データの取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。
          </p>

          <h2 className={styles.h2}>1. 取得する情報</h2>
          <ul>
            <li>メールアドレス（ログイン認証のため）</li>
            <li>
              利用者が本サービスに入力したデータ（サブスクリプション、収益、為替・税率設定など）
            </li>
            <li>
              Google 連携を利用した場合：Gmail の請求関連メールの内容（解析対象として一時的に読み取り）
            </li>
            <li>Stripe 連携を利用した場合：接続した Stripe アカウントの売上・MRR 情報</li>
            <li>決済情報（Stripe を通じて処理。当社はカード番号を保持しません）</li>
            <li>アクセスに伴う技術情報（IP アドレス、ブラウザ情報、Cookie 等）</li>
          </ul>

          <h2 className={styles.h2}>2. 利用目的</h2>
          <ul>
            <li>本サービスの提供、認証、データの保存・表示のため</li>
            <li>有料プラン（Pro）の決済およびプラン状態の管理のため</li>
            <li>Gmail / Stripe からの請求・収益情報の自動取り込み機能の提供のため</li>
            <li>お問い合わせ対応、不正利用の防止、サービス改善のため</li>
          </ul>

          <h2 className={styles.h2}>3. 第三者サービスへの提供・処理委託</h2>
          <p>本サービスは、以下の外部サービスを利用します。各サービスのプライバシーポリシーも適用されます。</p>
          <ul>
            <li>
              <b>Supabase</b>：認証および利用データの保存基盤
            </li>
            <li>
              <b>Stripe</b>：決済処理、および（Pro 利用時）売上情報の取得
            </li>
            <li>
              <b>Google（Gmail API）</b>：（連携時）請求メールの読み取り
            </li>
            <li>
              <b>Anthropic（Claude API）</b>：Gmail / Stripe
              から取得した請求・売上データを、サブスクリプション情報として構造化・抽出する目的で送信し、解析します。
            </li>
            <li>
              <b>Vercel</b>：本サービスのホスティング基盤
            </li>
          </ul>
          <p>
            上記の解析処理に伴い、請求メール等の内容が Anthropic
            の API に送信されます。これらは抽出処理の目的にのみ用い、当社が広告等の目的で第三者に販売・提供することはありません。
          </p>

          <h2 className={styles.h2}>4. Google ユーザーデータの取扱い</h2>
          <p>
            本サービスが Google API
            を通じて取得した情報の利用は、Google API Services
            ユーザーデータポリシー（限定使用の要件を含む）に準拠します。Gmail
            データは利用者が連携を実行した取り込み処理の範囲でのみ使用し、当該目的以外には使用しません。
          </p>

          <h2 className={styles.h2}>5. データの保存と削除</h2>
          <p>
            利用データは利用者のアカウントに紐づけて保存されます。アカウントの削除をご希望の場合、または保存データの削除をご希望の場合は、お問い合わせ先までご連絡ください。遅滞なく対応します。
          </p>

          <h2 className={styles.h2}>6. 安全管理</h2>
          <p>
            当社は、取得した情報の漏洩・滅失・毀損の防止その他の安全管理のため、必要かつ適切な措置を講じます。各行のデータは行レベルセキュリティにより、本人のみがアクセスできるよう制御しています。
          </p>

          <h2 className={styles.h2}>7. Cookie</h2>
          <p>
            本サービスは、ログイン状態の維持のために Cookie
            を使用します。ブラウザの設定により無効化できますが、その場合一部機能が利用できないことがあります。
          </p>

          <h2 className={styles.h2}>8. 改定</h2>
          <p>
            本ポリシーは、必要に応じて改定することがあります。重要な変更がある場合は本サービス上で告知します。
          </p>

          <h2 className={styles.h2}>9. お問い合わせ窓口</h2>
          <p>
            合同会社AMOR（代表：川本翔）
            <br />
            info@amorjp.com
          </p>
        </div>
      </div>
    </main>
  )
}
