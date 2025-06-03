import { useState } from 'react';

export const useSnackbar = () => {
  const [snackbar, setSnackbar] = useState({
    isOpen: false,
    message: '',
    severity: 'info'
  });

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      isOpen: true,
      message,
      severity
    });
  };

  const hideSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const showSuccess = (message) => showSnackbar(message, 'success');
  const showError = (message) => showSnackbar(message, 'error');
  const showWarning = (message) => showSnackbar(message, 'warning');
  const showInfo = (message) => showSnackbar(message, 'info');

  return {
    snackbar,
    showSnackbar,
    hideSnackbar,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};
