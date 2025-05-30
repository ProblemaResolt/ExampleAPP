# Authentication & Subscription Management System

A full-stack application for user authentication, role-based access control, and subscription management.

## Features

- User authentication (email/password, Google, GitHub)
- Role-based access control (Admin, Company, Manager, Member)
- Session management with Redis
- Subscription management with Stripe
- Company and team management
- Email verification and password reset
- Rate limiting and security features

## Tech Stack

- **Frontend**: React.js (with React Native support planned)
- **Backend**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis
- **Web Server**: Nginx
- **Container**: Docker & Docker Compose
- **Authentication**: JWT, OAuth2
- **Payment**: Stripe

## Prerequisites

- Docker
- Docker Compose
- Node.js (for local development)
- Git

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Update the environment variables in `.env` file with your values.

4. Start the application:
```bash
docker compose up -d
```

5. Run database migrations:
```bash
docker compose exec backend npx prisma migrate dev
```

6. Create test data:
```bash
docker compose exec backend npx prisma db seed
```

The application will be available at:
- Frontend: http://localhost
- Backend API: http://localhost/api
- API Documentation: http://localhost/api/docs

## Development Commands

All commands should be run using Docker Compose:

```bash
# Install dependencies
docker compose exec backend npm install
docker compose exec frontend npm install

# Run migrations
docker compose exec backend npx prisma migrate dev

# Generate Prisma client
docker compose exec backend npx prisma generate

# Run tests
docker compose exec backend npm test
docker compose exec frontend npm test

# Build for production
docker compose exec backend npm run build
docker compose exec frontend npm run build

# View logs
docker compose logs -f [service-name]
```

## Frontend Pages

- **/login**: ログインページ
- **/register**: 新規登録ページ
- **/forgot-password**: パスワードリセット申請ページ
- **/reset-password/:token**: パスワードリセットページ
- **/verify-email/:token**: メールアドレス確認ページ（VerifyEmail.jsx）
- **/**: ダッシュボード
- **/profile**: プロフィール
- **/users**: ユーザー管理
- **/companies**: 会社管理
- **/subscriptions**: サブスクリプション管理

### VerifyEmail ページについて

- メール認証リンクからアクセスされ、トークンを検証し、成功・失敗のメッセージを表示します。
- 成功時は自動的にログインページへリダイレクトされます。
- 実装例は `frontend/src/pages/auth/VerifyEmail.jsx` を参照してください。 

## 要件定義

### 1. 機能要件

#### 1.1 認証・認可機能
- メールアドレス/パスワードによるログイン
- Google、GitHubによるOAuth2認証（予定）
- メールアドレス確認機能
- パスワードリセット機能
- セッション管理（Redis）
- JWTトークンによる認証
- ロールベースのアクセス制御

#### 1.2 ユーザー管理機能
- ユーザー登録
- プロフィール管理
- ユーザー一覧表示
- ユーザー権限管理
- ユーザー状態管理（アクティブ/非アクティブ）

#### 1.3 会社管理機能
- 会社登録
- 会社情報管理
- 会社一覧表示
- 会社メンバー管理
- 会社管理者権限

#### 1.4 サブスクリプション管理機能
- サブスクリプションプラン管理
- 支払い処理（Stripe）
- 利用状況の表示
- 請求管理
- プラン変更機能

#### 1.5 セキュリティ機能
- レート制限
- CSRF対策
- XSS対策
- SQLインジェクション対策
- セキュアヘッダー
- パスワードハッシュ化

### 2. 非機能要件

#### 2.1 性能要件
- ページロード時間: 2秒以内
- API応答時間: 500ms以内
- 同時接続ユーザー数: 1000人以上
- データベース応答時間: 200ms以内

#### 2.2 可用性要件
- システム稼働率: 99.9%
- バックアップ: 日次
- 障害復旧時間: 4時間以内
- メンテナンス時間: 月1回（深夜）

#### 2.3 セキュリティ要件
- SSL/TLS暗号化
- パスワードポリシー
- セッションタイムアウト
- アクセスログ記録
- 監査ログ

#### 2.4 スケーラビリティ要件
- 水平スケーリング対応
- データベースレプリケーション
- キャッシュ戦略
- CDN利用

## 基本設計

### 1. システムアーキテクチャ

#### 1.1 全体構成
```
[クライアント] ←→ [Nginx] ←→ [フロントエンド/バックエンド] ←→ [データベース/キャッシュ]
```

#### 1.2 コンポーネント構成
- フロントエンド: React.js (SPA)
- バックエンド: Express.js (RESTful API)
- データベース: PostgreSQL
- キャッシュ: Redis
- Webサーバー: Nginx
- コンテナ: Docker

#### 1.3 ネットワーク構成
- フロントエンド: ポート3000
- バックエンド: ポート4000
- Nginx: ポート80/443
- PostgreSQL: ポート5432
- Redis: ポート6379

### 2. データモデル

#### 2.1 エンティティ関係
```
User (1) ←→ (1) Company
Company (1) ←→ (N) Subscription
User (1) ←→ (N) Activity
Subscription (1) ←→ (1) Plan
```

#### 2.2 主要エンティティ
- User: ユーザー情報
- Company: 会社情報
- Subscription: サブスクリプション情報
- Plan: プラン情報
- Activity: アクティビティログ

## 詳細設計

### 1. フロントエンド設計

#### 1.1 コンポーネント構成
```
src/
├── components/          # 共通コンポーネント
│   ├── auth/          # 認証関連
│   ├── layout/        # レイアウト
│   ├── common/        # 汎用
│   └── forms/         # フォーム
├── pages/             # ページコンポーネント
├── contexts/          # コンテキスト
├── hooks/             # カスタムフック
└── utils/             # ユーティリティ
```

#### 1.2 状態管理
- React Context API
- React Query (データフェッチング)
- ローカルストレージ (トークン管理)

#### 1.3 ルーティング
- React Router v6
- 保護されたルート
- 認証状態に基づくリダイレクト

### 2. バックエンド設計

#### 2.1 API設計
```
/api
├── /auth              # 認証関連
├── /users             # ユーザー管理
├── /companies         # 会社管理
├── /subscriptions     # サブスクリプション
└── /activities        # アクティビティ
```

#### 2.2 ミドルウェア
- 認証ミドルウェア
- エラーハンドリング
- レート制限
- CORS設定
- セッション管理

#### 2.3 データベース設計
- Prismaスキーマ
- マイグレーション
- インデックス
- リレーション

### 3. セキュリティ設計

#### 3.1 認証フロー
1. ユーザー認証
2. JWTトークン生成
3. セッション管理
4. トークン検証
5. アクセス制御

#### 3.2 データ保護
- パスワードハッシュ化
- トークン暗号化
- セッション暗号化
- データバックアップ

#### 3.3 アクセス制御
- ロールベースの権限管理
- リソースベースのアクセス制御
- APIエンドポイント保護
- レート制限

管理者（ADMIN）

email: admin@example.com
password: admin123
会社管理者（COMPANY）

email: company1@example.com
password: Company123!
会社: 株式会社サンプル1
マネージャー（MANAGER）

email: manager1@example.com
password: Manager123!
所属: 株式会社サンプル1
メンバー（MEMBER）

email: member1@example.com
password: Member123!
所属: 株式会社サンプル1