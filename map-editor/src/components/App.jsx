import React, { useState, useEffect } from 'react';
import { MapViewer } from './MapViewer';
import { CellEditor } from './CellEditor';
import { MapController } from './MapController';
import { generateDisplayInfo } from 'game-engine/helpers';
import { loadTextures } from 'map-editor/services/textures';
import { initialise as initialiseMap, createNewMap, createNewMapState } from 'map-editor/services/map';
import { initialise as initialiseCamera, move as moveCamera, render as renderCamera } from 'map-editor/services/camera';
import { initialise as initialiseInputs } from 'map-editor/services/inputs';
import { initialise as initialiseScene, render as renderScene } from 'map-editor/services/scene';
import * as Types from 'map-editor/types';

// @ts-ignore
import Styles from './App.css';


const TARGET_FRAME_RATE_PER_SECOND = 30;
const GAME_TICK_INTERVAL_MS = 1000 / TARGET_FRAME_RATE_PER_SECOND;

export const App = () => {
  const [gameState, setGameState] = useState(null);

  const startGameLoop = async (canvasContext) => {
    const displayInfo = generateDisplayInfo({
      width: canvasContext.canvas.width,
      height: canvasContext.canvas.height,
      fieldOfView: 72,
    });

    await loadTextures({ displayInfo });
    
    const [ mapState, cameraState, inputState, sceneState ] = await Promise.all([
      initialiseMap(),
      initialiseCamera(),
      initialiseInputs(),
      initialiseScene({ displayInfo }),
    ]);

    setGameState({
      canvasContext,
      displayInfo,
      mapState,
      cameraState,
      inputState,
      sceneState,
    });
  };

  useEffect(() => {
    if (!gameState) {
      return;
    }

    const intervalId = setInterval(() => {
      const { canvasContext, displayInfo } = gameState;
      requestAnimationFrame(() => renderGame({ canvasContext, displayInfo }));
    }, GAME_TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);

  }, [gameState]);
  
  /**
   * Renders the game state to the provided canvas context.
   * @param {Object} params
   * @param {CanvasRenderingContext2D} params.canvasContext
   * @param {Types.DisplayInfo} params.displayInfo
   */
  const renderGame = ({ canvasContext, displayInfo }) => {
    if (gameState === null) {
      return;
    }

    const { mapState, cameraState, inputState } = gameState;

    moveCamera({ inputState, cameraState, mapState });
    
    const { wallRays } = renderScene({
      canvasContext,
      orientation: cameraState.camera.orientation,
      mapState,
      displayInfo,
    });

    renderCamera({ canvasContext, displayInfo });
  };

  const onNewMapRequested = (newMapConfig) => {
    const newMap = createNewMap(newMapConfig);
    setGameState({
      ...gameState,
      mapState: createNewMapState({ newMap }),
    });
  };

   return (
    <div className={Styles.appContainer}>
      <div className={Styles.mainRow}>
        <div className={Styles.mapViewerContainer}>
          <MapViewer onCanvasContextReady={startGameLoop}/>
        </div>
        <div className={Styles.mapControllerContainer}>
          <MapController gameState={gameState} onNewMapRequested={onNewMapRequested}/>
        </div>
      </div>
      <div className={Styles.cellEditorRow}>
        <CellEditor />
      </div>
    </div>
  );

 /* return (
    <div className={Styles.appContainer}>
      <div className={Styles.mainRow}>
        <div className={Styles.mapViewerContainer}>
          <MapViewer onCanvasContextReady={startGameLoop}/>
        </div>
        <div className={Styles.mapControllerContainer}>
          <MapController />
        </div>
      </div>
      <div className={Styles.cellEditorRow}>
        <CellEditor />
      </div>
    </div>
  );*/
};
