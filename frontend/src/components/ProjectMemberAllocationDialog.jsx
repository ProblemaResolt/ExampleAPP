import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { Alert } from '@mui/material';

const ProjectMemberAllocationDialog = ({ 
  open, 
  onClose, 
  member,
  project,
  onSave
}) => {
  const [error, setError] = useState('');

  // プロジェクトの存在確認
  React.useEffect(() => {
    if (open && (!project || !project.id)) {
      setError('プロジェクトが選択されていません');
      onClose();
    }
  }, [open, project, onClose]);

  const handleSubmit = async (values) => {
    try {
      if (!project?.id) {
        throw new Error('プロジェクトが選択されていません');
      }
      if (!member?.id) {
        throw new Error('メンバーが選択されていません');
      }

      setError(''); // エラーをリセット
      await onSave(values);
      onClose();
    } catch (error) {
      console.error('工数の設定に失敗しました:', error);
      setError(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        error.message || 
        '工数の設定に失敗しました'
      );
    }
  };

  const formik = useFormik({
    initialValues: {
      allocation: member?.projectMembership?.allocation || 1.0
    },
    validationSchema: yup.object({
      allocation: yup.number()
        .required('工数は必須です')
        .min(0, '工数は0以上である必要があります')
        .max(1, '工数は1以下である必要があります')
    }),
    onSubmit: handleSubmit,
  });

  if (!open) return null;

  const totalAllocation = member?.totalAllocation || 0;
  const currentAllocation = member?.projectMembership?.allocation || 0;
  const otherProjectsAllocation = totalAllocation - currentAllocation;
  const projectedTotal = otherProjectsAllocation + Number(formik.values.allocation);
  const isOverAllocated = projectedTotal > 1;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '500px' }}>
        <header className="w3-container w3-blue">
          <h3>メンバー工数の設定</h3>
        </header>
        <form onSubmit={formik.handleSubmit}>
          <div className="w3-container">
            {error && (
              <div className="w3-panel w3-pale-red w3-leftbar w3-border-red">
                <p>{error}</p>
              </div>
            )}
            <div className="w3-padding">
              <h4>{member?.firstName} {member?.lastName}</h4>
              <p className="w3-text-gray">プロジェクト: {project?.name}</p>
              <p className="w3-text-gray">
                現在の総工数: {Math.round(totalAllocation * 100)}%
              </p>
            </div>

            <div className="w3-row-padding">
              <div className="w3-col m12">
                <label>工数 (0.0 - 1.0)</label>
                <input
                  className={`w3-input w3-border ${formik.touched.allocation && formik.errors.allocation ? 'w3-border-red' : ''}`}
                  type="number"
                  name="allocation"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formik.values.allocation}
                  onChange={formik.handleChange}
                />
                {formik.touched.allocation && formik.errors.allocation && (
                  <div className="w3-text-red">{formik.errors.allocation}</div>
                )}
              </div>
            </div>

            {isOverAllocated && (
              <div className="w3-panel w3-pale-yellow w3-leftbar w3-border-yellow">
                <p>
                  警告: この設定により、このメンバーの総工数が100%を超過します。
                  <br />
                  予測される総工数: {Math.round(projectedTotal * 100)}%
                </p>
              </div>
            )}

            <div className="w3-row-padding">
              <div className="w3-col m12">
                <h5>工数の内訳:</h5>
                <ul className="w3-ul">
                  <li>このプロジェクト: {Math.round(formik.values.allocation * 100)}%</li>
                  <li>他のプロジェクト: {Math.round(otherProjectsAllocation * 100)}%</li>
                  <li className={`w3-text-${isOverAllocated ? 'red' : 'black'}`}>
                    合計: {Math.round(projectedTotal * 100)}%
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <footer className="w3-container w3-padding">
            <button type="button" className="w3-button w3-gray" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="w3-button w3-blue w3-right"
              disabled={formik.isSubmitting}
            >
              保存
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ProjectMemberAllocationDialog;
