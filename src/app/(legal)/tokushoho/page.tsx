import Link from 'next/link'
import type { Metadata } from 'next'
import styles from '../legal.module.css'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | Burn',
}

// 特定商取引法に基づく表記。日本の有料サービスでは掲示が法的に必須。
// 未確定の項目は【要記入】を実値に置き換えること。
export default function TokushohoPage() {
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
        <h1 className={styles.h1}>特定商取引法に基づく表記</h1>
        <p className={styles.updated}>最終更新日：2026年6月28日</p>

        <div className={styles.body}>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>販売事業者</th>
                <td>合同会社AMOR</td>
              </tr>
              <tr>
                <th>運営統括責任者</th>
                <td>川本翔</td>
              </tr>
              <tr>
                <th>所在地</th>
                <td>
                  <span className={styles.todo}>【要記入：登記上の住所】</span>
                  <br />
                  ※請求があった場合は遅滞なく開示します。
                </td>
              </tr>
              <tr>
                <th>電話番号</th>
                <td>
                  <span className={styles.todo}>【要記入：電話番号】</span>
                  <br />
                  ※請求があった場合は遅滞なく開示します。
                </td>
              </tr>
              <tr>
                <th>メールアドレス</th>
                <td>
                  <span className={styles.todo}>【要記入：問い合わせ用メール】</span>
                </td>
              </tr>
              <tr>
                <th>販売価格</th>
                <td>
                  各商品の購入ページに表示する価格（消費税込み）。Pro プランは買い切り（一括）です。
                  <br />
                  <span className={styles.todo}>【要記入：Pro の税込価格】</span>
                </td>
              </tr>
              <tr>
                <th>商品代金以外の必要料金</th>
                <td>インターネット接続に係る通信料金等はお客様のご負担となります。</td>
              </tr>
              <tr>
                <th>支払方法</th>
                <td>クレジットカード（Stripe 決済）</td>
              </tr>
              <tr>
                <th>支払時期</th>
                <td>購入手続き完了時にお支払いが確定します。</td>
              </tr>
              <tr>
                <th>商品の引渡時期</th>
                <td>決済完了後、ただちに Pro 機能が有効になります。</td>
              </tr>
              <tr>
                <th>返品・キャンセル</th>
                <td>
                  商品の性質上（デジタルサービス・買い切り）、決済完了後の返金・キャンセルは原則お受けできません。
                  当社の責に帰すべき事由により機能が提供されない場合は、個別に対応します。
                </td>
              </tr>
              <tr>
                <th>動作環境</th>
                <td>最新版の主要ウェブブラウザ（Chrome / Safari / Edge 等）</td>
              </tr>
            </tbody>
          </table>

          <p>
            本表記に関するお問い合わせは、上記メールアドレスまでご連絡ください。
          </p>
        </div>
      </div>
    </main>
  )
}
