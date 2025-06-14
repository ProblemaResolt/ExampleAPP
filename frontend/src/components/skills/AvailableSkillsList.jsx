import React from 'react';
import { FaPlus } from 'react-icons/fa';

const AvailableSkillsList = ({ 
  skills, 
  searchQuery, 
  selectedCategory, 
  onAddSkill, 
  isLoading = false 
}) => {
  return (
    <div className="w3-responsive">
      <table className="w3-table w3-striped w3-bordered">
        <thead>
          <tr className="w3-green">
            <th>スキル名</th>
            <th>カテゴリ</th>
            <th>説明</th>
            <th>追加</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill) => (
            <tr key={skill.id} className="w3-hover-light-gray">
              <td>{skill.name}</td>
              <td>
                <span className="w3-tag w3-round w3-small w3-green">
                  {skill.category || 'その他'}
                </span>
              </td>
              <td>
                <small className="w3-text-gray">
                  {skill.description || 'なし'}
                </small>
              </td>
              <td>
                <button
                  className="w3-button w3-small w3-blue"
                  onClick={() => onAddSkill(skill)}
                  title="会社に追加"
                  disabled={isLoading}
                >
                  <FaPlus />
                </button>
              </td>
            </tr>
          ))}
          {skills.length === 0 && (
            <tr>
              <td colSpan="4" className="w3-center w3-text-gray">
                {searchQuery || selectedCategory ? '該当するスキルがありません' : '利用可能なスキルがありません'}
                <br />
                <small style={{color: '#999', fontSize: '0.8em'}}>
                  デバッグ: フィルター後({skills.length}件)
                </small>
                <br />
                <div className="w3-panel w3-pale-blue w3-border-blue w3-margin-top w3-text-black">
                  <p><strong>💡 対処法:</strong></p>
                  <p>グローバルスキルが表示されない場合は、画面右上のユーザーメニューから「Logout」を選択し、再度ログインしてください。</p>
                  <p>システム更新により認証情報の更新が必要な場合があります。</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AvailableSkillsList;
