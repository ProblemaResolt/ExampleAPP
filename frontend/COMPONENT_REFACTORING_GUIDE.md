# フロントエンド コンポーネント構造 改善版

## 概要
コードの共通化とディレクトリ整理により、保守性と再利用性を向上させました。

## 新しいディレクトリ構造

```
src/components/
├── common/                     # 汎用共通コンポーネント
│   ├── ActionButtons.jsx       # アクションボタン群
│   ├── Card.jsx                # カードレイアウト
│   ├── EmployeeInfo.jsx        # 従業員情報表示
│   ├── ErrorMessage.jsx        # エラーメッセージ
│   ├── FilterPanel.jsx         # フィルターパネル
│   ├── Form.jsx                # 汎用フォーム
│   ├── FormField.jsx           # フォームフィールド
│   ├── Loading.jsx             # ローディング表示
│   ├── Modal.jsx               # 汎用モーダル
│   ├── MonthNavigation.jsx     # 月次ナビゲーション
│   ├── Pagination.jsx          # ページネーション
│   ├── SearchBox.jsx           # 検索ボックス
│   ├── SelectFilter.jsx        # ドロップダウンフィルター
│   ├── StatusBadge.jsx         # ステータスバッジ
│   ├── StatsSummary.jsx        # 統計サマリー
│   ├── Table.jsx               # 汎用テーブル
│   └── TabNavigation.jsx       # タブナビゲーション
├── employees/                  # 従業員管理専用
│   ├── EmployeeDetailModal.jsx # 従業員詳細モーダル
│   ├── EmployeeFilters.jsx     # 従業員フィルター
│   └── EmployeeTableRow.jsx    # 従業員テーブル行
├── attendance/                 # 勤怠管理専用
│   ├── AttendanceApproval*.jsx # 勤怠承認関連
│   ├── AttendanceDetailModal.jsx
│   ├── AttendanceFilters.jsx
│   ├── AttendanceTableRow.jsx  # 勤怠テーブル行
│   └── AttendanceToolbar.jsx   # 勤怠管理ツールバー
├── projects/                   # プロジェクト管理専用
│   ├── ProjectCard.jsx         # プロジェクトカード
│   ├── ProjectFilters.jsx      # プロジェクトフィルター
│   └── ProjectForm.jsx         # 既存
└── dashboard/                  # ダッシュボード専用
    └── AttendanceStatsChart.jsx # 統計グラフ
```

## 主な改善点

### 1. 共通コンポーネントの抽出
- **Table.jsx**: ソート機能付き汎用テーブル
- **Modal.jsx**: サイズ設定可能な汎用モーダル
- **Form.jsx**: バリデーション対応汎用フォーム
- **ActionButtons.jsx**: 統一されたアクションボタン群

### 2. 検索・フィルター機能の共通化
- **SearchBox.jsx**: 統一された検索UI
- **SelectFilter.jsx**: ドロップダウンフィルター
- **FilterPanel.jsx**: 折りたたみ可能なフィルターパネル

### 3. 画面固有コンポーネントの整理
- **employees/**: 従業員管理画面専用コンポーネント
- **attendance/**: 勤怠管理画面専用コンポーネント  
- **projects/**: プロジェクト管理画面専用コンポーネント

### 4. リファクタリング済みページ
- **EmployeesRefactored.jsx**: 従業員一覧ページ（400行→200行に削減）
- **AttendanceManagementRefactored.jsx**: 勤怠管理ページの整理

## 利用例

### 汎用テーブルの使用
```jsx
<Table
  columns={columns}
  data={tableData}
  sortColumn={orderBy}
  sortDirection={order}
  onSort={handleSort}
  isLoading={isLoading}
  actions={renderActions}
/>
```

### 従業員フィルターの使用
```jsx
<EmployeeFilters
  searchTerm={searchQuery}
  onSearchChange={setSearchQuery}
  roleFilter={filters.role}
  onRoleFilterChange={(value) => setFilters(prev => ({...prev, role: value}))}
/>
```

### アクションボタンの使用
```jsx
<ActionButtons
  actions={[
    { type: 'view', label: '詳細', onClick: handleView },
    { type: 'edit', label: '編集', onClick: handleEdit },
    { type: 'delete', label: '削除', onClick: handleDelete }
  ]}
  size="small"
/>
```

## 効果

1. **コード行数の削減**: 各ページファイルが平均50%短縮
2. **再利用性の向上**: 共通UIパターンをコンポーネント化
3. **保守性の向上**: 機能別にディレクトリを分割
4. **一貫性の確保**: 統一されたUI/UXパターン
5. **開発効率の向上**: 新しい画面開発時の既存コンポーネント活用

## 今後の活用

新しい画面開発時は以下の手順を推奨：
1. `common/` から適用可能なコンポーネントを確認
2. 画面固有の機能は専用ディレクトリに作成
3. 複数画面で使用される場合は `common/` に移動を検討

これにより、一貫性があり保守しやすいフロントエンドアーキテクチャを実現できます。
