import React from 'react';

const SearchFilter = ({ 
  searchQuery, 
  onSearchChange, 
  showCategoryFilter = false, 
  selectedCategory, 
  onCategoryChange, 
  categories = [], 
  placeholder = "検索...",
  categoryPlaceholder = "全カテゴリ"
}) => {
  return (
    <div className="w3-margin-bottom">
      <div className="w3-row-padding">
        <div className={`w3-col ${showCategoryFilter ? 'm8' : 'm12'}`}>
          <input
            className="w3-input w3-border"
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {showCategoryFilter && (
          <div className="w3-col m4">
            <select
              className="w3-select w3-border"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">{categoryPlaceholder}</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;
