import React, { useLayoutEffect } from 'react';
import { move as moveCamera } from 'map-editor/services/camera';
import { render as renderScene } from 'map-editor/services/scene';
import * as Types from 'map-editor/types';
// @ts-ignore
import Styles from './MapViewer.css';

export const MapViewer = ({ onCanvasContextReady }) => {
  useLayoutEffect (() => {
    const canvas = document.getElementById('map-viewer-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`document.getElementById('map-viewer-canvas') resulted in a non-canvas element`);
    }

    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // @ts-ignore
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) {
      throw new Error('Failed to get 2d canvas context');
    }

    onCanvasContextReady(canvasContext);
  }, []);

  return (
    <div className={Styles.mapViewer}>
      <div className={Styles.mapViewerCanvasContainer}>
        <canvas className={Styles.canvas} id='map-viewer-canvas' />
      </div>
    </div>
  );
};