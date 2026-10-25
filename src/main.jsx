import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* HashRouter so the built app works from GitHub Pages or any static host
        and sub-path with no rewrite rules. */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
