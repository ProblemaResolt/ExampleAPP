import React, { useState, useEffect } from 'react';
import '../styles/Snackbar.css';

const Snackbar = ({ message, severity = 'info', isOpen, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (isOpen && message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, message, duration, onClose]);

  if (!isOpen || !message) {
    return null;
  }

  return (
    <div className={`snackbar show ${severity}`}>
      {message}
    </div>
  );
};

export default Snackbar;
