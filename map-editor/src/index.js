import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components';

const initialise = async () => {
  const root = createRoot(document.getElementById('app'));
  root.render(<App />);
};

initialise();