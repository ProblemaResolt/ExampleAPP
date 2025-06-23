import React from 'react';
import { FaTimes } from 'react-icons/fa';

const ModalWrapper = ({ isOpen, onClose, title, children, maxWidth = '800px' }) => {
  if (!isOpen) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div 
        className="w3-modal-content w3-animate-top w3-card-4" 
        style={{ maxWidth, margin: '5% auto' }}
      >
        <header className="w3-container w3-indigo">
          <span 
            className="w3-button w3-display-topright w3-hover-red"
            onClick={onClose}
          >
            <FaTimes />
          </span>
          <h3>{title}</h3>
        </header>
        
        <div className="w3-container w3-padding">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ModalWrapper;
