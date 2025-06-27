import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * スキル関連のキャッシュを無効化・リフレッシュするフック
 * スキル変更後に他のページで最新データを表示するために使用
 */
export const useSkillsRefresh = () => {
  const queryClient = useQueryClient();

  // 会社選択済みスキルのキャッシュを無効化
  const invalidateCompanySkills = useCallback(() => {
    queryClient.invalidateQueries(['company-skills']);
  }, [queryClient]);

  // 既定スキルのキャッシュを無効化
  const invalidateDefaultSkills = useCallback(() => {
    queryClient.invalidateQueries(['default-skills']);
  }, [queryClient]);

  // 全スキル関連のキャッシュを無効化
  const invalidateAllSkills = useCallback(() => {
    queryClient.invalidateQueries(['company-skills']);
    queryClient.invalidateQueries(['default-skills']);
  }, [queryClient]);

  // 会社選択済みスキルを強制リフェッチ
  const refetchCompanySkills = useCallback(() => {
    return queryClient.refetchQueries(['company-skills']);
  }, [queryClient]);

  // 既定スキルを強制リフェッチ
  const refetchDefaultSkills = useCallback(() => {
    return queryClient.refetchQueries(['default-skills']);
  }, [queryClient]);

  // 全スキルを強制リフェッチ
  const refetchAllSkills = useCallback(async () => {
    await Promise.all([
      queryClient.refetchQueries(['company-skills']),
      queryClient.refetchQueries(['default-skills'])
    ]);
  }, [queryClient]);

  return {
    invalidateCompanySkills,
    invalidateDefaultSkills,
    invalidateAllSkills,
    refetchCompanySkills,
    refetchDefaultSkills,
    refetchAllSkills,
  };
};
