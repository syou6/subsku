import Link from 'next/link'
import type { Metadata } from 'next'
import styles from '../legal.module.css'

export const metadata: Metadata = {
  title: '利用規約 | Burn',
}

// 利用規約。課金・解約・免責の基本を定める。
export default function TermsPage() {
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
        <h1 className={styles.h1}>利用規約</h1>
        <p className={styles.updated}>最終更新日：2026年6月28日</p>

        <div className={styles.body}>
          <p>
            本利用規約（以下「本規約」）は、合同会社AMOR（以下「当社」）が提供するサービス「Burn」（以下「本サービス」）の利用条件を定めるものです。利用者は、本サービスを利用することにより本規約に同意したものとみなされます。
          </p>

          <h2 className={styles.h2}>第1条（適用）</h2>
          <p>本規約は、利用者と当社との間の本サービスの利用に関わる一切の関係に適用されます。</p>

          <h2 className={styles.h2}>第2条（アカウント）</h2>
          <ul>
            <li>利用者は、自己の責任においてアカウントを管理するものとします。</li>
            <li>
              ログインに用いるメールアドレス等の管理不十分による損害の責任は利用者が負うものとします。
            </li>
          </ul>

          <h2 className={styles.h2}>第3条（料金・支払い）</h2>
          <ul>
            <li>
              本サービスには無料プランと有料プラン（Pro）があります。Pro
              プランは買い切り（一括）であり、価格は購入ページに表示します。
            </li>
            <li>支払いは Stripe を通じたクレジットカード決済により行います。</li>
            <li>
              商品の性質上、決済完了後の返金は原則行いません。詳細は
              <Link href="/tokushoho">特定商取引法に基づく表記</Link>に従います。
            </li>
          </ul>

          <h2 className={styles.h2}>第4条（禁止事項）</h2>
          <p>利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
          <ul>
            <li>法令または公序良俗に違反する行為</li>
            <li>当社または第三者の権利を侵害する行為</li>
            <li>本サービスの運営を妨害する行為、不正アクセス、リバースエンジニアリング</li>
            <li>料金制限その他の機能制限を回避しようとする行為</li>
          </ul>

          <h2 className={styles.h2}>第5条（外部サービス・自動取り込み）</h2>
          <p>
            本サービスは、Gmail・Stripe
            等の外部サービスと連携する機能を提供します。取り込み結果の正確性は保証されず、利用者は内容をご自身で確認の上ご利用ください。データの取扱いは
            <Link href="/privacy">プライバシーポリシー</Link>に従います。
          </p>

          <h2 className={styles.h2}>第6条（免責事項）</h2>
          <ul>
            <li>
              本サービスが表示するバーンレート・ランウェイ・節税額等は概算であり、税務・会計・投資上の助言ではありません。最終的な判断は利用者の責任で行うものとします。
            </li>
            <li>
              当社は、本サービスの内容の正確性・完全性・有用性を保証せず、利用により生じた損害について、当社の故意または重過失による場合を除き責任を負いません。
            </li>
            <li>外部サービスの仕様変更・停止により機能が利用できなくなる場合があります。</li>
          </ul>

          <h2 className={styles.h2}>第7条（サービスの変更・停止）</h2>
          <p>
            当社は、利用者への事前の通知なく、本サービスの内容を変更し、または提供を停止・終了することができます。
          </p>

          <h2 className={styles.h2}>第8条（規約の変更）</h2>
          <p>
            当社は、必要と判断した場合、本規約を変更できるものとします。変更後に本サービスを利用した場合、変更後の規約に同意したものとみなします。
          </p>

          <h2 className={styles.h2}>第9条（準拠法・裁判管轄）</h2>
          <p>
            本規約は日本法を準拠法とし、本サービスに関して紛争が生じた場合には、当社の所在地を管轄する裁判所を専属的合意管轄裁判所とします。
          </p>

          <h2 className={styles.h2}>お問い合わせ</h2>
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
