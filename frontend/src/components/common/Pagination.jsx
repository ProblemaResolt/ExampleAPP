import React from 'react';

/**
 * ページネーションコンポーネント
 * @param {object} pagination - ページネーション情報
 * @param {function} onPageChange - ページ変更ハンドラー
 */
const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // 調整: 終了ページが最大より小さい場合、開始ページを調整
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // 最初のページ
    if (startPage > 1) {
      buttons.push(
        <button
          key={1}
          className="w3-button w3-hover-blue"
          onClick={() => onPageChange(1)}
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(
          <span key="start-ellipsis" className="w3-button" disabled>
            ...
          </span>
        );
      }
    }

    // 中間のページ
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`w3-button ${currentPage === i ? 'w3-blue' : 'w3-hover-blue'}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }

    // 最後のページ
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="end-ellipsis" className="w3-button" disabled>
            ...
          </span>
        );
      }
      buttons.push(
        <button
          key={totalPages}
          className="w3-button w3-hover-blue"
          onClick={() => onPageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="w3-center w3-margin-top">
      <div className="w3-bar">
        <button
          className="w3-button w3-hover-blue"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          前へ
        </button>
        
        {renderPageButtons()}
        
        <button
          className="w3-button w3-hover-blue"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          次へ
        </button>
      </div>
      <p className="w3-small w3-text-gray w3-margin-top">
        {totalItems}件中 {startItem}～{endItem}件表示
      </p>
    </div>
  );
};

export default Pagination;
