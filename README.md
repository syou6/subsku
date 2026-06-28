# BURN — ひとりスタートアップの燃焼率

AIツール・SaaSの月額をまとめて、バーンレート / ランウェイ / 黒字化までの距離を可視化する、ひとり開発者向けのコスト管理 SaaS。元は単一ファイルの React アーティファクトだったものを、認証・永続化・課金つきのマルチテナント SaaS に再構築したもの。

## スタック

- **Next.js 15** (App Router, TypeScript)
- **Supabase** — 認証（マジックリンク / Google OAuth）+ Postgres（RLS でユーザー分離）
- **Stripe** — Burn 自体の Pro サブスク課金
- **Anthropic API + MCP** — Gmail 請求取り込み / Stripe MRR 取り込み（サーバー側で実行、APIキーは非公開）
- **Vercel** — デプロイ先

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. Supabase

1. プロジェクトを作成
2. SQL エディタで [`supabase/schema.sql`](supabase/schema.sql) を実行（profiles / burn_state テーブル + RLS + 新規ユーザーのシード）
3. Authentication → Providers で Email（マジックリンク）と Google を有効化
4. リダイレクト URL に `https://<your-domain>/auth/callback` を追加

### 3. Stripe

1. Pro 用の **継続課金 price** を作成 → `STRIPE_PRICE_PRO`
2. Webhook エンドポイント `https://<your-domain>/api/stripe/webhook` を作成し、以下を購読:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Webhook の署名シークレット → `STRIPE_WEBHOOK_SECRET`

### 4. 環境変数

[`.env.example`](.env.example) をコピーして `.env.local` を作成し、値を埋める。

```bash
cp .env.example .env.local
```

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | クライアント / サーバー共通 |
| `SUPABASE_SERVICE_ROLE_KEY` | Stripe webhook のプラン更新（サーバー専用） |
| `ANTHROPIC_API_KEY` | 取り込み用 Claude 呼び出し（サーバー専用） |
| `STRIPE_MCP_TOKEN` / `GMAIL_MCP_TOKEN` | 接続済み MCP サーバーの OAuth トークン（後述） |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PRO` | Burn の Pro 課金 |
| `NEXT_PUBLIC_SITE_URL` | チェックアウトのリダイレクト先 |

### 5. 開発サーバー

```bash
npm run dev
```

## アーキテクチャ要点

- **永続化**: アプリの状態（subs / projects / 為替 / 設定）は `burn_state.data` の単一 JSONB に保存。元アーティファクトのデータモデルをそのまま踏襲。クライアントは `/api/data` に debounce 付きで PUT、サーバー側で zod 検証（[`src/lib/schema.ts`](src/lib/schema.ts)）。
- **セキュリティ**: Anthropic / Stripe のシークレットは**サーバー専用**。元アーティファクトはブラウザから直接 Anthropic を叩いていたが、すべて API ルートに移動。RLS で各ユーザーは自分の行のみアクセス可能。
- **課金ゲート**: Gmail / Stripe の自動取り込みは **Pro 限定**。無料ユーザーがボタンを押すと Stripe チェックアウトへ誘導。プラン変更の真実のソースは Stripe webhook（[`src/app/api/stripe/webhook/route.ts`](src/app/api/stripe/webhook/route.ts)）。

### MCP トークンについて（重要）

取り込みルート（[`src/lib/anthropic-import.ts`](src/lib/anthropic-import.ts)）は Anthropic Messages API の MCP コネクタ経由で `mcp.stripe.com` / Gmail MCP を呼ぶ。本番では各ユーザーが自分の Stripe / Google を接続し、その OAuth トークンを**ユーザーごとに**保存して `authorization_token` に渡すべき。現状は単一テナント向けに env (`STRIPE_MCP_TOKEN` / `GMAIL_MCP_TOKEN`) から読む実装で、per-user OAuth 保存は未実装（TODO）。

## デプロイ（Vercel）

1. リポジトリを Vercel にインポート
2. 上記の環境変数をすべて設定
3. Stripe webhook の URL を本番ドメインに更新
4. Supabase の認証リダイレクト URL に本番ドメインを追加
