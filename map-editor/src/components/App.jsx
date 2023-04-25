import React, { useState } from 'react';
import map from '../data/map1.json';

export const App = () => {
  const [appState, setAppState] = useState({
    map,
  });

  return (
    <div><p>This is the main app</p></div>
  );
};