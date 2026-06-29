# Time Cap — 時間遅延型の感情保存

今の気持ちと痕跡を残し、未来に必ず見返させる。  
**能動で「封じる」** / **受動で「貯まる」** — いいねもフォロワー数もない、エモ専用の場所。

## 開き方

```bash
cd sealed && python3 -m http.server 8770
# → http://localhost:8770
```

本番: https://sealed-psi.vercel.app

## タブ構成

| タブ | 役割 |
|------|------|
| **タイムライン** | 今日の問い・アクティビティ・投稿フィード |
| **マップ** | 軌跡の線と点（Exif） |
| **＋封じる** | 封じる / いま残す |
| **振り返り** | 思い出・音楽・ストリーク・招待 |
| **メッセージ** | 未来DM · 個人的な返信 |

状態は `localStorage`（`timecap_v9`）と IndexedDB（メディア）。  
ログイン後は **API セッション** で `promptAnswers` と写真をサーバー同期（Vercel Blob + Upstash KV）。

### 本番 API 環境変数（Vercel）

| 変数 | 用途 |
|------|------|
| `RESEND_API_KEY` | 確認コードメール（設定済み） |
| `API_SESSION_SECRET` | セッション署名（`scripts/setup-production.sh` で自動生成） |
| `BLOB_READ_WRITE_TOKEN` | 写真＋promptAnswers 保存（Blob 連携で自動注入） |
| `UPSTASH_REDIS_REST_URL` | （任意）Upstash KV。未設定時は Blob にフォールバック |
| `UPSTASH_REDIS_REST_TOKEN` | （任意）Upstash 認証 |

### 本番セットアップ（ワンコマンド）

```bash
cd sealed && bash scripts/setup-production.sh
```

Blob ストア作成・環境変数・本番デプロイまで自動実行します。

### API エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/verify-code` | 確認コード検証 → `session` 返却 |
| GET | `/api/prompt-answers?date=&groupId=&memberIds=` | 自分＋Family の回答取得（写真ゲート適用） |
| POST | `/api/prompt-answers` | 回答の保存・更新 |
| POST | `/api/upload-media` | 写真アップロード（`dataUrl` または `base64`） |

KV / Blob 未設定時はローカルのみ動作（503 で API はフォールバック）。

## 開発者向け

**期間まとめは 1 つの汎用テンプレにジャンルを足していく。** 音楽はその最初のジャンル。人・声・ルート・推しを別実装しない。

詳細 → **[ARCHITECTURE.md](./ARCHITECTURE.md)**

