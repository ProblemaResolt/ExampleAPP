# 統合管理システム（社員・プロジェクト・スキル・勤怠管理）

包括的な企業向けの統合管理システムです。社員管理、プロジェクト管理、スキル管理、勤怠管理の機能を統合し、効率的な人事・プロジェクト運営を支援します。

## 目次

1. [概要](#概要)
2. [実装済み機能](#実装済み機能)
3. [今後の実装予定](#今後の実装予定)
4. [技術スタック](#技術スタック)
5. [要件定義](#要件定義)
6. [基本設計](#基本設計)
7. [詳細設計](#詳細設計)
8. [API仕様](#api仕様)
9. [セットアップ](#セットアップ)
10. [Dockerコマンド一覧](#dockerコマンド一覧)
11. [テストユーザーアカウント](#テストユーザーアカウント)
12. [開発ガイド](#開発ガイド)
13. [変更履歴](#変更履歴)

## 概要

本システムは、現代の企業が抱える人事管理とプロジェクト管理の課題を解決するために設計された統合管理システムです。ロールベースのアクセス制御により、システム管理者、会社管理者、マネージャー、メンバーそれぞれに適切な権限を付与し、効率的な組織運営を実現します。

### 主な特徴

- **多層ロール管理**: システム管理者から一般メンバーまでの4段階の権限システム
- **プロジェクト工数管理**: リアルタイムな工数割り当てと可視化
- **スキル管理**: 従業員のスキルセットの一元管理
- **認証・セキュリティ**: JWT + OAuth2による堅牢な認証システム
- **サブスクリプション**: Stripe連携による柔軟な課金システム
- **レスポンシブUI**: W3.CSSベースのモダンなユーザーインターフェース

## 実装済み機能

### 🔐 認証・セキュリティ機能
- [x] メールアドレス/パスワード認証
- [x] Google OAuth2認証（設定済み）
- [x] GitHub OAuth2認証（設定済み）
- [x] JWT トークン認証
- [x] セッション管理（Redis）
- [x] メールアドレス確認機能
- [x] パスワードリセット機能
- [x] レート制限
- [x] CSRF・XSS対策
- [x] アカウントロック機能（5回失敗で15分ロック）

### 👥 ユーザー・権限管理
- [x] 4段階ロール管理（ADMIN、COMPANY、MANAGER、MEMBER）
- [x] ユーザー作成・編集・削除
- [x] プロフィール管理
- [x] ユーザー状態管理（アクティブ/非アクティブ）
- [x] 会社別ユーザー管理
- [x] ロール表示名統一（COMPANY: 管理者、ADMIN: システム管理者）

### 🏢 会社管理機能
- [x] 会社情報登録・編集
- [x] 会社一覧表示
- [x] 会社メンバー管理
- [x] 会社管理者権限

### 👨‍💼 社員管理機能
- [x] 社員一覧表示・検索・ソート
- [x] 社員詳細情報管理
- [x] スキル情報の登録・編集（スキルID不整合修正済み）
- [x] 従業員作成時のスキル処理（バックエンド修正済み）
- [x] ページネーション
- [x] 社員作成・編集ダイアログ
- [x] バルク操作

### 🛠️ スキル管理機能
- [x] スキル一覧表示
- [x] スキル新規追加（スナックバー通知対応）
- [x] スキル編集・削除
- [x] 社員別スキル経験年数管理
- [x] スキル統計表示
- [x] メンバー追加時のスキルフィルタリング（新システム対応）
- [x] スキル追加時の成功/エラー通知（スナックバー）

### 📊 プロジェクト管理機能
- [x] プロジェクト作成・編集・削除
- [x] プロジェクトメンバー管理
- [x] 工数割り当て管理
- [x] プロジェクトステータス管理
- [x] 総工数表示・警告機能
- [x] マネージャー・メンバー区分管理

### 💳 サブスクリプション管理
- [x] Stripe連携
- [x] プラン管理（FREE、BASIC、PREMIUM、ENTERPRISE）
- [x] 支払い処理
- [x] サブスクリプション状態管理
- [x] Webhookによる自動更新
- [x] 請求履歴

### 📈 ダッシュボード・分析
- [x] 概要ダッシュボード
- [x] アクティビティログ
- [x] 最新ユーザー表示
- [x] システム統計

### 🎨 UI/UX
- [x] W3.CSSベースのモダンUI
- [x] レスポンシブデザイン
- [x] 日本語対応
- [x] ロール別アイコン表示
- [x] ステータス別カラーコーディング
- [x] スナックバー通知システム
- [x] DOM検証警告の解決（React適合性向上）
- [x] ユーザビリティ改善（UIテキスト最適化）

## 今後の実装予定

### 🔧 Phase 1: 機能強化・UI改善（優先度：高）
- [ ] ダッシュボード強化（チャート・グラフ表示）
- [ ] 詳細な権限管理とロールベースアクセス制御の拡張
- [ ] リアルタイム通知システム（WebSocket対応）
- [ ] ファイルアップロード機能（プロフィール画像、プロジェクト資料）
- [ ] API ドキュメント自動生成（Swagger/OpenAPI）
- [ ] E2E テスト導入（Playwright）
- [ ] セキュリティ監査ログとアクセス履歴
- [ ] 高度な検索・フィルタリング機能
- [ ] ダークモード・テーマ切り替え機能

### 🕐 Phase 2: 勤怠管理機能（優先度：高）
- [ ] 出勤・退勤打刻システム
- [ ] 休憩時間管理
- [ ] 残業時間自動計算
- [ ] 勤怠状況一覧・月次レポート
- [ ] 承認ワークフロー（上司承認）
- [ ] 有給休暇・各種休暇管理
- [ ] GPS位置情報による打刻制限
- [ ] 顔認証打刻機能（将来）

### 📊 Phase 3: 分析・レポート機能（優先度：中）
- [ ] 工数分析ダッシュボード
- [ ] スキルマップ分析・可視化
- [ ] プロジェクト効率性分析
- [ ] 勤怠トレンド分析
- [ ] カスタムレポート機能
- [ ] CSV インポート/エクスポート機能
- [ ] 自動レポート生成・メール配信

### 🔗 Phase 4: 外部連携・モバイル対応（優先度：中）
- [ ] Slack/Teams連携（通知・ボット）
- [ ] Google Calendar連携
- [ ] React Native モバイルアプリ
- [ ] モバイル打刻機能
- [ ] プッシュ通知
- [ ] オフライン対応
- [ ] 給与計算システム連携

### 🌐 Phase 5: 国際化・パフォーマンス（優先度：低）
- [ ] 多言語対応（i18n - 日本語/英語）
- [ ] Redis キャッシュ最適化
- [ ] データベースクエリ最適化
- [ ] CDN導入・画像最適化
- [ ] PWA対応（オフライン機能）
- [ ] パフォーマンス監視・メトリクス

### 🚀 Phase 6: 高度な機能（優先度：低）
- [ ] CI/CD パイプライン構築（GitHub Actions）
- [ ] プロジェクトテンプレート機能
- [ ] カレンダー統合とスケジュール管理
- [ ] AI活用（工数予測、スキル推奨）
- [ ] ワークフロー自動化
- [ ] 多テナント対応（SaaS化）

## 技術スタック

### フロントエンド
- **Framework**: React.js 18.2
- **Router**: React Router v6
- **State Management**: React Context API + useState/useEffect
- **UI Framework**: W3.CSS 4.15
- **Icons**: React Icons (Font Awesome)
- **HTTP Client**: Axios 1.6
- **Form Validation**: 手動バリデーション（Yup導入予定）
- **Build Tool**: Vite 5.0
- **Development**: Hot Module Replacement (HMR)

### バックエンド
- **Runtime**: Node.js 20
- **Framework**: Express.js 4.18
- **ORM**: Prisma 5.7
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Authentication**: JWT + Passport.js + bcryptjs
- **OAuth2**: Google OAuth2, GitHub OAuth2
- **Payment**: Stripe SDK
- **Email**: Nodemailer (Gmail SMTP)
- **Validation**: express-validator + カスタムバリデーション
- **Session Store**: connect-redis
- **File Upload**: 未実装（将来: multer予定）

### インフラ・DevOps
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (Reverse Proxy)
- **Environment**: dotenv
- **Process Management**: Node.js直接実行（PM2導入予定）
- **Database Migration**: Prisma Migrate
- **Seed Data**: Prisma Seed
- **Monitoring**: 未実装（将来: Prometheus + Grafana予定）
- **Logging**: Morgan (HTTP) + console (App)

### セキュリティ
- **Authentication**: JWT (30日有効期限)
- **Password Hashing**: bcryptjs (saltRounds: 12)
- **Rate Limiting**: express-rate-limit
- **Security Headers**: Helmet.js
- **CORS**: cors middleware
- **Session Security**: httpOnly cookies
- **OAuth2 Providers**: Google, GitHub
- **Account Security**: 自動ロック（5回失敗で15分）

### データベース・ストレージ
- **Primary DB**: PostgreSQL 15
- **Cache**: Redis 7 (セッション、一時データ)
- **ORM**: Prisma (型安全なクエリ)
- **Migration**: Prisma Migrate
- **Backup**: 手動 pg_dump（自動化予定）
- **File Storage**: ローカルファイルシステム（将来: AWS S3予定）

### 開発・テスト
- **Package Manager**: npm
- **Code Quality**: ESLint（設定予定）
- **Formatting**: Prettier（設定予定）
- **Testing**: Jest（設定予定）
- **API Testing**: 未実装（Supertest予定）
- **E2E Testing**: 未実装（Playwright予定）
- **Type Checking**: 未実装（TypeScript移行予定）

## 要件定義

### 1. 機能要件

#### 1.1 認証・認可機能
- **必須**: メールアドレス/パスワード認証
- **必須**: ロールベースアクセス制御（4段階）
- **必須**: セッション管理
- **必須**: パスワードリセット機能
- **必須**: メールアドレス確認
- **オプション**: OAuth2認証（Google、GitHub）
- **オプション**: 多要素認証（MFA）

#### 1.2 ユーザー管理機能
- **必須**: CRUD操作（作成・読み取り・更新・削除）
- **必須**: プロフィール管理
- **必須**: 権限管理
- **必須**: 状態管理（アクティブ/非アクティブ）
- **必須**: 検索・ソート・フィルタリング

#### 1.3 社員管理機能
- **必須**: 社員情報の一元管理
- **必須**: スキル情報の関連付け
- **必須**: プロジェクト割り当て管理
- **必須**: 組織階層の管理
- **拡張**: 評価・査定機能

#### 1.4 プロジェクト管理機能
- **必須**: プロジェクト情報管理
- **必須**: メンバー管理
- **必須**: 工数管理
- **必須**: 進捗管理
- **拡張**: ガントチャート
- **拡張**: リソース最適化

#### 1.5 スキル管理機能
- **必須**: スキルマスタ管理
- **必須**: 社員別スキル管理
- **必須**: 経験年数管理
- **拡張**: スキルレベル評価
- **拡張**: スキルマップ可視化

#### 1.6 勤怠管理機能（今後実装）
- **必須**: 出退勤打刻
- **必須**: 労働時間計算
- **必須**: 休暇管理
- **必須**: 承認ワークフロー
- **拡張**: GPS打刻
- **拡張**: 顔認証打刻

#### 1.7 サブスクリプション管理機能
- **必須**: プラン管理
- **必須**: 支払い処理
- **必須**: 請求管理
- **必須**: 利用状況監視

### 2. 非機能要件

#### 2.1 性能要件
- **ページロード時間**: 3秒以内（初回）、1秒以内（キャッシュ後）
- **API応答時間**: 500ms以内（平均）、2秒以内（95%ile）
- **同時接続ユーザー数**: 100人（初期）、1000人（拡張時）
- **データベース応答時間**: 200ms以内

#### 2.2 可用性要件
- **稼働率**: 99.5%（初期）、99.9%（本格運用）
- **バックアップ**: 日次自動バックアップ
- **障害復旧時間**: 4時間以内
- **メンテナンス**: 月1回、深夜時間帯

#### 2.3 セキュリティ要件
- **暗号化**: SSL/TLS 1.3
- **認証**: JWT + 30日有効期限
- **パスワードポリシー**: 6文字以上
- **セッションタイムアウト**: 30日
- **監査ログ**: 全API操作を記録
- **脆弱性対策**: OWASP Top 10対応

#### 2.4 スケーラビリティ要件
- **水平スケーリング**: コンテナベース
- **データベース**: レプリケーション対応
- **キャッシュ**: Redis クラスタ
- **ファイル配信**: CDN対応

#### 2.5 ユーザビリティ要件
- **レスポンシブ**: モバイル・タブレット対応
- **多言語**: 日本語・英語（将来）
- **アクセシビリティ**: WCAG 2.1 AA準拠（目標）
- **ブラウザ対応**: Chrome、Firefox、Safari、Edge

## 基本設計

### 1. システムアーキテクチャ

#### 1.1 全体構成
```
[ユーザー] ←→ [Nginx (Reverse Proxy)] ←→ [React Frontend] 
                                      ↓
                               [Express Backend] ←→ [PostgreSQL]
                                      ↓              ↓
                                  [Redis Cache] ←→ [Backup]
                                      ↓
                               [External APIs]
                              (Stripe, Email, OAuth)
```

#### 1.2 アプリケーション層構成
- **プレゼンテーション層**: React.js（SPA）
- **ビジネスロジック層**: Express.js（RESTful API）
- **データアクセス層**: Prisma ORM
- **データ永続化層**: PostgreSQL
- **キャッシュ層**: Redis
- **外部連携層**: Stripe、Email、OAuth providers

#### 1.3 セキュリティ境界
- **DMZ**: Nginx（SSL終端、リバースプロキシ）
- **アプリケーション**: Express.js（認証・認可）
- **データ**: PostgreSQL（暗号化、アクセス制御）
- **セッション**: Redis（暗号化セッション）

### 2. データモデル設計

#### 2.1 論理ERD
```
[User] ←1:1→ [Company] ←1:N→ [Subscription]
  ↓                              ↓
  1:N                         [Payment]
  ↓
[UserSkill] ←N:1→ [Skill]
  ↓
[ProjectMembership] ←N:1→ [Project]
  ↓
[Activity]
```

#### 2.2 主要エンティティ
- **User**: ユーザー基本情報、認証情報
- **Company**: 会社情報、設定
- **Project**: プロジェクト情報、期間
- **ProjectMembership**: プロジェクト参加情報、工数
- **Skill**: スキルマスタ
- **UserSkill**: ユーザー別スキル、経験年数
- **Subscription**: サブスクリプション情報
- **Payment**: 支払い履歴
- **Activity**: アクティビティログ

#### 2.3 ロール定義
- **ADMIN**: システム管理者（全ての操作が可能）
- **COMPANY**: 会社管理者（自社内の全操作が可能）
- **MANAGER**: マネージャー（自チーム内の操作が可能）
- **MEMBER**: 一般メンバー（自身の情報のみ操作可能）

### 3. インターフェース設計

#### 3.1 画面遷移図
```
Login → Dashboard → [Users, Employees, Projects, Skills, Companies, Profile]
  ↓
Register → Email Verification → Login
  ↓
Forgot Password → Reset Password → Login
```

#### 3.2 主要画面
- **認証系**: ログイン、新規登録、パスワードリセット
- **ダッシュボード**: 概要、統計情報
- **ユーザー管理**: 一覧、作成、編集
- **社員管理**: 一覧、詳細、スキル管理
- **プロジェクト管理**: 一覧、作成、メンバー管理
- **スキル管理**: マスタ管理、統計
- **会社管理**: 会社情報、設定
- **プロフィール**: 個人設定、パスワード変更

## 詳細設計

### 1. フロントエンド設計

#### 1.1 ディレクトリ構成
```
frontend/src/
├── components/           # 共通コンポーネント
│   ├── Layout.jsx       # 基本レイアウト
│   ├── Navigation.jsx   # ナビゲーション
│   ├── EmployeeDialog.jsx # 社員登録・編集ダイアログ
│   └── ...
├── pages/               # ページコンポーネント
│   ├── Dashboard.jsx    # ダッシュボード
│   ├── Users.jsx        # ユーザー管理
│   ├── Employees.jsx    # 社員管理
│   ├── Projects.jsx     # プロジェクト管理
│   ├── Skills.jsx       # スキル管理
│   ├── Companies.jsx    # 会社管理
│   ├── Profile.jsx      # プロフィール
│   ├── Login.jsx        # ログイン
│   └── Register.jsx     # 新規登録
├── contexts/            # React Context
│   └── AuthContext.jsx # 認証コンテキスト
├── utils/               # ユーティリティ
│   ├── axios.js        # HTTP クライアント設定
│   └── constants.js    # 定数定義
├── layouts/             # レイアウトコンポーネント
│   └── AuthLayout.jsx  # 認証レイアウト
└── App.jsx             # ルートコンポーネント
```

#### 1.2 状態管理方針
- **グローバル状態**: React Context API（認証情報）
- **サーバー状態**: React Query（API データ）
- **ローカル状態**: useState（フォーム、UI状態）
- **永続化**: localStorage（認証トークン）

#### 1.3 コンポーネント設計原則
- **再利用性**: 共通コンポーネントの積極的な活用
- **責務分離**: プレゼンテーション vs ロジック
- **型安全性**: PropTypes による型チェック
- **テスタビリティ**: 単体テスト可能な設計

### 2. バックエンド設計

#### 2.1 ディレクトリ構成
```
backend/src/
├── routes/              # ルート定義
│   ├── auth.js         # 認証関連API
│   ├── users.js        # ユーザー管理API
│   ├── companies.js    # 会社管理API
│   ├── subscriptions.js # サブスクリプションAPI
│   ├── activities.js   # アクティビティAPI
│   └── projects.js     # プロジェクト管理API
├── middleware/          # ミドルウェア
│   ├── auth.js         # 認証ミドルウェア
│   ├── error.js        # エラーハンドリング
│   └── rateLimiter.js  # レート制限
├── config/              # 設定ファイル
│   └── passport.js     # Passport設定
├── utils/               # ユーティリティ
│   ├── email.js        # メール送信
│   └── workload.js     # 工数計算
├── lib/                 # ライブラリ
│   └── prisma.js       # Prisma設定
└── app.js              # Express アプリケーション
```

#### 2.2 API設計原則
- **RESTful**: リソースベースのURL設計
- **統一性**: 一貫したレスポンス形式
- **バージョニング**: APIバージョン管理
- **ドキュメント**: Swagger/OpenAPI対応（予定）

#### 2.3 エラーハンドリング
- **統一形式**: AppError クラスによる標準化
- **適切なHTTPステータス**: 200, 201, 400, 401, 403, 404, 500
- **詳細情報**: 開発環境でのスタックトレース
- **ロギング**: 構造化ログによる監視

### 3. データベース設計

#### 3.1 テーブル設計
```sql
-- 主要テーブル構成
User              # ユーザー情報
Company           # 会社情報
Project           # プロジェクト
ProjectMembership # プロジェクト参加
Skill             # スキルマスタ
UserSkill         # ユーザー別スキル
Subscription      # サブスクリプション
Payment           # 支払い履歴
Activity          # アクティビティログ
```

#### 3.2 インデックス戦略
- **主キー**: 自動生成CUID
- **外部キー**: 参照整合性制約
- **検索用**: email, role, companyId等
- **複合**: userId + skillId等

#### 3.3 データ整合性
- **制約**: NOT NULL, UNIQUE, FOREIGN KEY
- **バリデーション**: アプリケーション層でのチェック
- **トランザクション**: Prisma transaction API使用

### 4. セキュリティ設計

#### 4.1 認証フロー
```
1. ログイン要求 → 2. 認証情報検証 → 3. JWT生成 → 4. トークン返却
5. API要求 → 6. トークン検証 → 7. ユーザー情報取得 → 8. 認可チェック
```

#### 4.2 認可モデル
- **階層制御**: ADMIN > COMPANY > MANAGER > MEMBER
- **リソース制御**: 会社、プロジェクト、ユーザー単位
- **操作制御**: CRUD操作の細かな制御

#### 4.3 セキュリティ対策
- **XSS対策**: Content Security Policy、入力サニタイズ
- **CSRF対策**: SameSite Cookie、CSRFトークン
- **SQLインジェクション**: Prisma ORM使用
- **レート制限**: express-rate-limit使用
- **セキュアヘッダー**: Helmet.js使用

## API仕様

### 認証API
```
POST   /api/auth/login           # ログイン
POST   /api/auth/register        # 新規登録
POST   /api/auth/logout          # ログアウト
POST   /api/auth/refresh-token   # トークン更新
GET    /api/auth/verify-email/:token  # メール確認
POST   /api/auth/forgot-password     # パスワードリセット要求
POST   /api/auth/reset-password/:token # パスワードリセット
GET    /api/auth/google          # Google OAuth
GET    /api/auth/github          # GitHub OAuth
```

### ユーザー管理API
```
GET    /api/users               # ユーザー一覧取得
POST   /api/users               # ユーザー作成
GET    /api/users/me            # 自身の情報取得
PATCH  /api/users/me            # 自身の情報更新
POST   /api/users/me/change-password # パスワード変更
GET    /api/users/company/:companyId # 会社別ユーザー一覧
PATCH  /api/users/:userId       # ユーザー更新
DELETE /api/users/:userId       # ユーザー削除
PATCH  /api/users/:userId/status # ユーザー状態切り替え
```

### スキル管理API
```
GET    /api/skills              # スキル一覧取得
POST   /api/skills              # スキル作成
PATCH  /api/skills/:skillId     # スキル更新
DELETE /api/skills/:skillId     # スキル削除
GET    /api/users/:userId/skills # ユーザー別スキル取得
POST   /api/users/:userId/skills # ユーザーへのスキル追加
PATCH  /api/users/:userId/skills/:skillId # ユーザースキル更新
DELETE /api/users/:userId/skills/:skillId # ユーザースキル削除
```

### 会社管理API
```
GET    /api/companies           # 会社一覧取得
POST   /api/companies           # 会社作成
GET    /api/companies/:companyId # 会社詳細取得
PATCH  /api/companies/:companyId # 会社更新
DELETE /api/companies/:companyId # 会社削除
```

### プロジェクト管理API
```
GET    /api/projects            # プロジェクト一覧取得
POST   /api/projects            # プロジェクト作成
GET    /api/projects/:projectId # プロジェクト詳細取得
PATCH  /api/projects/:projectId # プロジェクト更新
DELETE /api/projects/:projectId # プロジェクト削除
GET    /api/projects/:projectId/members # プロジェクトメンバー一覧
POST   /api/projects/:projectId/members # メンバー追加
PATCH  /api/projects/:projectId/members/:membershipId # メンバー情報更新
DELETE /api/projects/:projectId/members/:membershipId # メンバー削除
```

### サブスクリプション管理API
```
GET    /api/subscriptions       # サブスクリプション一覧
POST   /api/subscriptions/company/:companyId # サブスクリプション作成
GET    /api/subscriptions/company/:companyId # 会社サブスクリプション取得
PATCH  /api/subscriptions/:subscriptionId   # サブスクリプション更新
POST   /api/subscriptions/:subscriptionId/cancel # サブスクリプション解約
POST   /api/subscriptions/webhook # Stripe Webhook
```

### アクティビティAPI
```
GET    /api/activities/recent   # 最新アクティビティ取得
```

### レスポンス形式

#### 成功レスポンス
```json
{
  "status": "success",
  "data": {
    // レスポンスデータ
  },
  "message": "操作が正常に完了しました",
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

#### エラーレスポンス
```json
{
  "status": "error",
  "message": "エラーメッセージ",
  "errors": [
    {
      "field": "email",
      "message": "有効なメールアドレスを入力してください"
    }
  ],
  "code": "VALIDATION_ERROR",
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req-12345"
  }
}
```

#### ページネーションレスポンス
```json
{
  "status": "success",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## セットアップ

### 1. 前提条件
- Docker & Docker Compose
- Git
- Node.js 20+ (ローカル開発時)

### 2. 環境構築

#### 2.1 リポジトリクローン
```bash
git clone <repository-url>
cd <repository-name>
```

#### 2.2 環境変数設定
```bash
cp .env.example .env
# .envファイルを編集して適切な値を設定
```

#### 2.3 アプリケーション起動
```bash
# コンテナ起動
docker compose up -d

# データベースセットアップ
docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma db seed
```

### アクセス確認
- **フロントエンド**: http://localhost （Nginx経由）
- **バックエンド API**: http://localhost/api （Nginx経由）
- **直接バックエンドアクセス**: http://localhost:4000 （開発時のみ）
- **データベース**: localhost:5432 （PostgreSQL）
- **Redis**: localhost:6379 （Redis）
- **Prisma Studio**: http://localhost:5555 （開発時のみ）

### 3. 必要な環境変数

#### バックエンド (.env)
```bash
# Database（本番環境では適切な認証情報に変更）
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/app?schema=public"
REDIS_URL="redis://redis:6379"

# Authentication（必ず変更してください）
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-this-too"
SESSION_SECRET="your-session-secret-for-oauth-sessions"

# OAuth2設定（Google/GitHub Console で取得）
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email設定（Gmail SMTP例）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"  # Googleアプリパスワード
EMAIL_FROM_NAME="統合管理システム"
EMAIL_FROM_ADDRESS="your-email@gmail.com"

# Stripe設定（テストキー例）
STRIPE_SECRET_KEY="sk_test_..."  # Stripeダッシュボードから取得
STRIPE_PUBLISHABLE_KEY="pk_test_..."  # Stripeダッシュボードから取得
STRIPE_WEBHOOK_SECRET="whsec_..."  # Stripe CLI で生成

# URLs（開発環境）
FRONTEND_URL="http://localhost"
BACKEND_URL="http://localhost/api"

# 環境設定
NODE_ENV="development"  # development | production
PORT="4000"  # バックエンドサーバーポート
```

#### フロントエンド (.env)
```bash
# API接続設定
VITE_API_URL="http://localhost:4000"  # 開発時は直接接続、本番はプロキシ経由

# Stripe公開キー（バックエンドと同じ値）
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# 開発設定
VITE_NODE_ENV="development"
```

#### 本番環境での注意事項
- **JWT_SECRET**: ランダムな64文字以上の文字列を使用
- **データベース認証情報**: 強力なパスワードを設定
- **HTTPS**: 本番では必ずSSL/TLS証明書を設定
- **CORS**: 適切なオリジンのみ許可
- **Rate Limiting**: 本番環境に応じて調整

## Dockerコマンド一覧

### サービス構成
本プロジェクトは以下のDockerサービスで構成されています：
- **nginx**: リバースプロキシ（ポート80）
- **frontend**: React開発サーバー（内部ポート3000）
- **backend**: Express API サーバー（内部ポート4000）
- **postgres**: PostgreSQL データベース（ポート5432）
- **redis**: Redis キャッシュ（ポート6379）

### 基本操作
```bash
# 全サービス起動
docker compose up -d

# 全サービス停止
docker compose down

# ログ確認
docker compose logs -f [service-name]

# サービス再起動
docker compose restart [service-name]

# 全体再ビルド
docker compose up -d --build
```

### 開発コマンド
```bash
# 依存関係インストール
docker compose exec backend npm install
docker compose exec frontend npm install

# データベース操作
docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma migrate reset
docker compose exec backend npx prisma db seed
docker compose exec backend npx prisma generate
docker compose exec backend npx prisma studio

# テスト実行
docker compose exec backend npm test
docker compose exec frontend npm test

# プロダクションビルド
docker compose exec backend npm run build
docker compose exec frontend npm run build
```

### トラブルシューティング
```bash
# コンテナ状態確認
docker compose ps

# ボリューム確認
docker volume ls

# ネットワーク確認
docker network ls

# データベース接続確認
docker compose exec postgres psql -U postgres -d app

# Redis接続確認
docker compose exec redis redis-cli ping

# ボリュームクリア（データベースリセット）
docker compose down -v
docker compose up -d
```

### メンテナンス
```bash
# ディスク使用量確認
docker system df

# 不要なリソース削除
docker system prune

# ログローテーション
docker compose logs --tail=100 [service-name]

# バックアップ
docker compose exec postgres pg_dump -U postgres app > backup.sql

# リストア
docker compose exec -T postgres psql -U postgres app < backup.sql
```

## テストユーザーアカウント

以下のテストアカウントが`npx prisma db seed`コマンドで自動作成されます：

### システム管理者（ADMIN）
- **Email**: admin@example.com
- **Password**: admin123
- **権限**: 全システムの管理権限
- **説明**: 全ての機能にアクセス可能

### 会社管理者（COMPANY）
- **Email**: company1@example.com
- **Password**: Company123!
- **会社**: 株式会社サンプル1
- **権限**: 自社内の全管理権限
- **説明**: 自社の社員・プロジェクト管理が可能

### マネージャー（MANAGER）
- **Email**: manager1@example.com
- **Password**: Manager123!
- **所属**: 株式会社サンプル1
- **職位**: プロジェクトマネージャー
- **権限**: 担当プロジェクトの管理権限
- **説明**: プロジェクトメンバーの管理が可能

### 一般メンバー（MEMBER）
- **Email**: member1@example.com
- **Password**: Member123!
- **所属**: 株式会社サンプル1
- **職位**: エンジニア
- **権限**: 自身の情報のみ編集可能
- **説明**: 基本的な機能のみ利用可能

### ログイン方法
1. http://localhost にアクセス
2. 上記のEmail/Passwordでログイン
3. ロールに応じた画面が表示されます

### 注意事項
- **本番環境では必ずパスワードを変更してください**
- 初期データには会社「株式会社サンプル1」が作成済みです
- 各ユーザーはメールアドレス確認済み状態で作成されます
- スキルマスタも初期データとして作成済みです

## 開発ガイド

### 開発環境セットアップ
1. 上記のセットアップ手順を実行
2. IDE設定（VS Code推奨）
3. 開発用ブラウザ設定
4. デバッグ環境構築

### コーディング規約
- **JavaScript**: ESLint + Prettier（設定予定）
- **CSS**: W3.CSS 4.15 + カスタムスタイル
- **命名規則**: camelCase（JS）、kebab-case（CSS）
- **コメント**: JSDoc形式（一部実装済み）
- **ファイル命名**: PascalCase（コンポーネント）、camelCase（その他）
- **インポート**: 絶対パス推奨（src/からの相対パス）

### ディレクトリ規約
- **components/**: 再利用可能なUIコンポーネント
- **pages/**: ページレベルコンポーネント
- **contexts/**: React Context定義
- **utils/**: ユーティリティ関数
- **layouts/**: レイアウトコンポーネント
- **routes/**: APIルート定義（backend）
- **middleware/**: Express ミドルウェア（backend）

### Git規約
- **ブランチ**: feature/機能名、fix/修正内容、refactor/リファクタ内容
- **コミット**: 日本語OK、簡潔で分かりやすく
- **プルリクエスト**: 機能単位での作成を推奨

### テスト戦略
- **単体テスト**: Jest + React Testing Library
- **結合テスト**: Supertest（API）
- **E2Eテスト**: Playwright（予定）
- **カバレッジ**: 80%以上目標

### デプロイメント
- **開発環境**: Docker Compose
- **ステージング**: 未設定
- **本番環境**: 未設定
- **CI/CD**: GitHub Actions（予定）

### 監視・ログ
- **アプリケーションログ**: 構造化JSON
- **アクセスログ**: Morgan
- **エラートラッキング**: 未実装
- **メトリクス**: 未実装

---

## 変更履歴

### 2025年6月5日
#### バグ修正・UI改善
- **DOM検証警告の修正**: 複数のファイル（Skills.jsx、Projects.jsx、Employees.jsx）で`</thead>`と`<tbody>`タグ間の空白を削除し、React DOM検証警告を解決
- **従業員作成時のスキルID不整合修正**: バックエンドの`users.js`でスキルデータ変換処理を修正、`CompanySelectedSkill.id`を返すように変更（従来は`GlobalSkill.id`を返していたため不整合が発生）
- **AddMemberDialogのスキルフィルタリング修正**: 新しいスキル管理システムに対応し、`companySelectedSkillId`フィールドをチェックする機能を追加、フォールバック比較も実装

#### 機能追加・UI改善
- **Skills.jsxにスナックバー通知機能追加**: 
  - 既存のSnackbarコンポーネントを統合
  - スキル追加時の成功/エラー通知をアラートからスナックバーに変更
  - スキル名を含む詳細な通知メッセージを実装
- **UIテキストの改善**: 
  - "独自スキル作成" → "利用可能スキル以外の追加" に変更
  - 説明文に "自社フレームワークや利用可能スキルに無いもの" を追加してより明確化
- **コードの品質向上**: 重複する関数宣言を解決し、コンパイルエラーを修正

#### 技術的改善
- **デバッグログの追加**: 従業員保存機能にデバッグログを追加してスキルデータフローを追跡可能に
- **エラーハンドリングの改善**: スキル関連の処理でより適切なエラーメッセージとログ出力を実装
- **コード整理**: 未使用のコードと重複する機能を整理し、保守性を向上

---

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 貢献

プルリクエストやイシューの報告を歓迎します。

## サポート

技術的な質問や問題については、GitHubのIssuesページをご利用ください。