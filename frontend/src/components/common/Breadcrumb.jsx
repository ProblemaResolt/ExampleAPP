import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaChevronRight } from 'react-icons/fa';

const Breadcrumb = ({ items = [] }) => {
  const location = useLocation();

  // デフォルトのパンくずアイテム
  const defaultItems = [
    { label: 'ホーム', path: '/', icon: <FaHome /> }
  ];

  const allItems = [...defaultItems, ...items];

  return (
    <nav className="w3-container w3-margin-bottom">
      <div className="w3-bar w3-light-grey w3-padding-small w3-round">
        {allItems.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="w3-margin w3-text-grey">
                <FaChevronRight size="12" />
              </span>
            )}
            {index === allItems.length - 1 ? (
              // 最後のアイテムは現在のページなのでリンクにしない
              <span className="w3-text-blue w3-margin-small">
                {item.icon && <span className="w3-margin-right">{item.icon}</span>}
                {item.label}
              </span>
            ) : (
              <Link 
                to={item.path} 
                className="w3-text-blue w3-hover-text-dark-blue w3-margin-small"
                style={{ textDecoration: 'none' }}
              >
                {item.icon && <span className="w3-margin-right">{item.icon}</span>}
                {item.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

export default Breadcrumb;
