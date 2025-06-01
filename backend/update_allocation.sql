-- 既存のプロジェクトメンバーの工数を0.5に更新
UPDATE "ProjectMembership" SET allocation = 0.5 WHERE allocation = 1.0;
