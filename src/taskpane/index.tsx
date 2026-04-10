import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import '../ui/styles/taskpaneUtilities.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Task pane root container was not found.');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
