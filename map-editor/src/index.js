import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components';
import './reset.css';
import './variables.css';
import './main.css';

const initialise = async () => {
  const root = createRoot(document.getElementById('app'));
  root.render(<App />);
};

initialise();