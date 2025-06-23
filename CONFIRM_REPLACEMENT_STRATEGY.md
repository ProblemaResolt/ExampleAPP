# 確認ダイアログの置き換え方針

## Confirmダイアログの問題
- `window.confirm()` は削除確認によく使われる
- スナックバーは単方向の通知なので、確認には適さない
- 代替案が必要

## 推奨される解決策

### 1. 削除系の操作
```jsx
// ❌ 従来の方法
if (window.confirm('削除しますか？')) {
  deleteItem();
}

// ✅ 推奨方法1: モーダルダイアログ
const [showDeleteDialog, setShowDeleteDialog] = useState(false);

// ✅ 推奨方法2: 条件付き実行
const handleDelete = () => {
  // 直接削除実行
  deleteItem();
  showSuccess('削除しました');
};
```

### 2. useSkills.jsの場合
```jsx
const handleRemoveSkillFromCompany = (skill) => {
  // 確認なしで削除を実行し、成功時にスナックバー表示
  removeSkillFromCompany.mutate(skill.id);
};
```

## 実装方針
1. **危険な操作**: モーダルダイアログを作成
2. **一般的な操作**: confirmを削除してスナックバーのみ
3. **批判的操作**: ダブルクリックや長押しパターン
