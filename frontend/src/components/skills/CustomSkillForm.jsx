import React from 'react';
import { FaPlus, FaLightbulb } from 'react-icons/fa';

const CustomSkillForm = ({ 
  formData, 
  onFormChange, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="w3-container">
      <div className="w3-green w3-margin-bottom">
        <div className="w3-container w3-padding">
          <h4><FaLightbulb className="w3-margin-right" />利用可能スキル以外の追加</h4>
          <p>自社フレームワークや利用可能スキルに無いものを追加できます。グローバルスキルにない技術や会社特有のスキルを追加してください。</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w3-container">
        <div className="w3-row-padding">
          <div className="w3-half">
            <label className="w3-text-blue"><b>スキル名 *</b></label>
            <input
              className="w3-input w3-border w3-margin-bottom"
              type="text"
              placeholder="例: 独自フレームワーク、社内システム、特殊ツール..."
              value={formData.name}
              onChange={(e) => onFormChange('name', e.target.value)}
              required
            />
          </div>
          <div className="w3-half">
            <label className="w3-text-blue"><b>カテゴリ *</b></label>
            <input
              className="w3-input w3-border w3-margin-bottom"
              type="text"
              placeholder="例: フロントエンド、バックエンド、ツール..."
              value={formData.category}
              onChange={(e) => onFormChange('category', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="w3-margin-bottom">
          <label className="w3-text-blue"><b>説明</b></label>
          <textarea
            className="w3-input w3-border"
            rows="3"
            placeholder="スキルの詳細説明（任意）"
            value={formData.description}
            onChange={(e) => onFormChange('description', e.target.value)}
          ></textarea>
        </div>

        <div className="w3-margin-bottom">
          <button
            type="submit"
            className="w3-button w3-blue w3-margin-right"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fa fa-spinner fa-spin w3-margin-right"></i>
                作成中...
              </>
            ) : (
              <>
                <FaPlus className="w3-margin-right" />
                スキルを追加
              </>
            )}
          </button>
          <button
            type="button"
            className="w3-button w3-gray"
            onClick={onCancel}
          >
            キャンセル
          </button>
        </div>
      </form>

      <div className="w3-panel w3-pale-yellow w3-border-yellow">
        <h4>ご注意</h4>
        <ul>
          <li>追加したスキルは自動的に会社のスキル選択に追加されます</li>
          <li>既存のグローバルスキルと重複する名前は使用できません</li>
          <li>会社内で既に同じ名前のスキルがある場合は追加できません</li>
          <li>自社フレームワークや特殊ツールなど、利用可能スキルにないものを追加してください</li>
        </ul>
      </div>
    </div>
  );
};

export default CustomSkillForm;
