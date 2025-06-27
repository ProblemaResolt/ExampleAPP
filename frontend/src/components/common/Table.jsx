import React from 'react';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

/**
 * 汎用テーブルコンポーネント
 */
const Table = ({ 
  columns, 
  data, 
  sortColumn, 
  sortDirection, 
  onSort, 
  isLoading = false,
  emptyMessage = "データがありません",
  className = "",
  actions = null
}) => {
  const getSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) return <FaSort className="w3-text-gray" />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  if (isLoading) {
    return (
      <div className="w3-center w3-padding-large">
        <i className="fa fa-spinner fa-spin w3-xxlarge"></i>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className={`w3-responsive ${className}`}>
      <table className="w3-table-all w3-hoverable w3-card">
        <thead>
          <tr className="w3-light-gray">
            {columns.map((column) => (
              <th 
                key={column.key} 
                className={column.sortable ? "w3-button" : ""}
                onClick={column.sortable ? () => onSort(column.key) : undefined}
                style={{ 
                  width: column.width,
                  cursor: column.sortable ? 'pointer' : 'default'
                }}
              >
                <div className="w3-cell-row">
                  <div className="w3-cell">{column.label}</div>
                  {column.sortable && (
                    <div className="w3-cell w3-cell-middle">
                      {getSortIcon(column.key)}
                    </div>
                  )}
                </div>
              </th>
            ))}
            {actions && <th>操作</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length + (actions ? 1 : 0)} 
                className="w3-center w3-padding-large w3-text-gray"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={row.id || index} className="w3-hover-light-gray">
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions && (
                  <td>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
