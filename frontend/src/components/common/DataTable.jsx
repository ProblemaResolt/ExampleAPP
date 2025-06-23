import React from 'react';

/**
 * データテーブルコンポーネント
 * 美しいテーブルレイアウトとホバーエフェクトを持つ再利用可能なテーブル
 */
const DataTable = ({
  headers,
  data,
  renderRow,
  title = null,
  icon = null,
  isLoading = false,
  emptyMessage = 'データがありません',
  className = '',
  tableClassName = 'w3-table-all w3-hoverable'
}) => {
  if (isLoading) {
    return (
      <div className={`w3-card w3-round-large ${className}`}>
        {title && (
          <header className="w3-container w3-light-grey w3-padding">
            <h5>
              {icon && <span className="w3-margin-right">{icon}</span>}
              {title}
            </h5>
          </header>
        )}
        <div className="w3-container w3-center w3-padding-32">
          <div className="w3-spin w3-margin">⟳</div>
          <p>データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w3-card w3-round-large ${className}`}>
      {title && (
        <header className="w3-container w3-light-grey w3-padding">
          <h5>
            {icon && <span className="w3-margin-right">{icon}</span>}
            {title}
          </h5>
        </header>
      )}
      <div className="w3-responsive">
        <table className={tableClassName}>
          {headers && (
            <thead>
              <tr className="w3-blue">
                {headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {data && data.length > 0 ? (
              data.map((item, index) => renderRow(item, index))
            ) : (
              <tr>
                <td colSpan={headers?.length || 1} className="w3-center w3-padding-32">
                  <p className="w3-text-grey">{emptyMessage}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
