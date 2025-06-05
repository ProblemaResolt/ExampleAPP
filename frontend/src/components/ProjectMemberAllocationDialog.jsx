import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { FaUser, FaExclamationTriangle, FaPercent as FaPercentage } from 'react-icons/fa';

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
  const isOverAllocated = projectedTotal > 1;  return (
    <div className="w3-modal" style={{ display: 'block', zIndex: 1002 }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ width: 'auto' }}>
        <header className="w3-container w3-blue">
          <span 
            onClick={onClose}
            className="w3-button w3-display-topright"
          >
            &times;
          </span>
          <h4>
            <FaPercentage className="w3-margin-right" />
            メンバー工数の設定
          </h4>
        </header>
        <form onSubmit={formik.handleSubmit}>
          <div className="w3-container">
            {error && (
              <div className="w3-panel w3-pale-red w3-leftbar w3-border-red">
                <p>{error}</p>
              </div>
            )}            <div className="w3-padding">
              <h5>
                <FaUser className="w3-margin-right" />
                {member?.lastName}  {member?.firstName} 
              </h5>
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
            </div>            {isOverAllocated && (
              <div className="w3-panel w3-pale-yellow w3-leftbar w3-border-yellow w3-round">
                <p>
                  <FaExclamationTriangle className="w3-margin-right w3-text-orange" />
                  <strong>警告:</strong> この設定により、このメンバーの総工数が100%を超過します。
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
          </div>          <footer className="w3-container w3-border-top w3-padding-16 w3-light-grey">
            <div className="w3-bar w3-right">
              <button 
                type="button" 
                className="w3-button w3-white w3-border w3-round-large w3-margin-right" 
                onClick={onClose}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="w3-button w3-blue w3-round-large"
                disabled={formik.isSubmitting}
              >
                保存
              </button>
            </div>
            <div className="w3-clear"></div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ProjectMemberAllocationDialog;
