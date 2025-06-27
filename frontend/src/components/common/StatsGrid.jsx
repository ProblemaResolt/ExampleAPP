import React from 'react';

/**
 * 統計グリッドコンテナー
 * レスポンシブなグリッドレイアウトで統計カードを配置
 */
const StatsGrid = ({
  children,
  columns = 4,
  gap = 'w3-margin-bottom',
  className = 'w3-row-padding w3-stretch'
}) => {
  const getColumnClass = (totalColumns) => {
    const columnMap = {
      1: 'l12 m12 s12',
      2: 'l6 m6 s12',
      3: 'l4 m6 s12',
      4: 'l3 m6 s12',
      5: 'l2 m4 s12',
      6: 'l2 m4 s12'
    };
    return columnMap[totalColumns] || 'l3 m6 s12';
  };

  const columnClass = `w3-col ${getColumnClass(columns)} ${gap}`;

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div key={index} className={columnClass}>
          {child}
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;
