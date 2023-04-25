import React, { useEffect } from 'react';
import * as gameScene from '../../../game-engine/src/scene';

export const MapViewer = ({ map }) => {
  useLayoutEffect (() => {
    const canvasElement = document.getElementById('scene-canvas');
    
    gameScene.render({ })
  }, [map])

  return (
    <div><canvas id='scene-canvas'></canvas></div>
  );
};