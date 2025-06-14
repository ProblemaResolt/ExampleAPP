import React from 'react';
import { FaTrash } from 'react-icons/fa';

const CompanySkillsList = ({ 
  skills, 
  searchQuery, 
  onRemoveSkill, 
  isLoading = false 
}) => {
  return (
    <div className="w3-responsive">
      <table className="w3-table w3-striped w3-bordered">
        <thead>
          <tr className="w3-green">
            <th>スキル名</th>
            <th>カテゴリ</th>
            <th>使用者数</th>
            <th>必須</th>
            <th>編集</th>
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
                <span className="w3-tag w3-green">
                  {skill._count?.userSkills || 0}人
                </span>
              </td>
              <td>
                {skill.isRequired ? (
                  <span className="w3-tag w3-red">必須</span>
                ) : (
                  <span className="w3-tag w3-gray">任意</span>
                )}
              </td>
              <td>
                <button
                  className="w3-button w3-small w3-red"
                  onClick={() => onRemoveSkill(skill)}
                  title="会社から削除"
                  disabled={isLoading}
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
          {skills.length === 0 && (
            <tr>
              <td colSpan="5" className="w3-center w3-text-gray">
                {searchQuery ? '該当するスキルがありません' : '選択済みスキルがありません'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CompanySkillsList;
