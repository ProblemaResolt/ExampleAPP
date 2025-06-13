import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  // React.StrictModeを無効化して永久リロード問題を解決
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
