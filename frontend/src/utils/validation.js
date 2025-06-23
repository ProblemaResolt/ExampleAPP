import * as Yup from 'yup';

export const statusLabels = {
  PLANNED: '計画中',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
  ON_HOLD: '保留中'
};

export const projectSchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(1, 'プロジェクト名は必須です')
    .max(100, 'プロジェクト名は100文字以内で入力してください')
    .required('プロジェクト名は必須です'),
  description: Yup.string()
    .max(500, '説明は500文字以内で入力してください'),
  clientCompanyName: Yup.string()
    .trim()
    .max(100, 'クライアント企業名は100文字以内で入力してください'),
  clientContactName: Yup.string()
    .trim()
    .max(100, '担当者名は100文字以内で入力してください'),
  clientContactPhone: Yup.string()
    .trim()
    .max(20, '電話番号は20文字以内で入力してください'),
  clientContactEmail: Yup.string()
    .trim()
    .email('有効なメールアドレスを入力してください')
    .max(100, 'メールアドレスは100文字以内で入力してください'),
  clientPrefecture: Yup.string()
    .trim()
    .max(10, '都道府県は10文字以内で入力してください'),
  clientCity: Yup.string()
    .trim()
    .max(50, '市町村は50文字以内で入力してください'),
  clientStreetAddress: Yup.string()
    .trim()
    .max(100, '番地は100文字以内で入力してください'),
  startDate: Yup.date()
    .required('開始日は必須です'),
  endDate: Yup.date()
    .nullable()
    .min(Yup.ref('startDate'), '終了日は開始日より後の日付を選択してください'),
  status: Yup.string()
    .oneOf(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'], '無効なステータスです')
    .required('ステータスは必須です'),
  managerIds: Yup.array()
    .min(1, 'プロジェクトマネージャーは必須です')
    .required('プロジェクトマネージャーは必須です')
});

export const memberSchema = Yup.object({
  allocation: Yup.number()
    .min(0, '工数は0以上で入力してください')
    .max(1, '工数は1以下で入力してください')
    .required('工数は必須です')
});

export const periodSchema = Yup.object({
  startDate: Yup.date()
    .required('開始日は必須です'),
  endDate: Yup.date()
    .nullable()
    .min(Yup.ref('startDate'), '終了日は開始日より後の日付を選択してください')
});
