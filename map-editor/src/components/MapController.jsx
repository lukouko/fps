import React, { useState } from 'react';
import { NewMapModal } from './NewMapModal';
import { Button, ButtonTypes } from './Button';
// @ts-ignore
import Styles from './MapController.css';
import * as Types from 'map-editor/types';

/**
 * 
 * @param {Object} params
 * @param {Types.GameState|Object} params.gameState
 * @param {function} params.onNewMapRequested
 * @returns {JSX.Element}
 */
export const MapController = ({ gameState, onNewMapRequested }) => {
  const [showNewMapModal, setShowNewMapModal] = useState(false);

  const handleNewMapRequested = (newMapConfig) => {
    onNewMapRequested(newMapConfig);
    setShowNewMapModal(false);
  };

  console.log('Rendering with showNEwMapModal', showNewMapModal);

  return (
    <div className={Styles.mapController}>
      {showNewMapModal && <NewMapModal onConfirm={handleNewMapRequested} onCancel={() => setShowNewMapModal(false)} />}
      <div className={Styles.mapFileMenu}>
        <Button type={ButtonTypes.PRIMARY} label="New Map" onClick={() => setShowNewMapModal(true)}/>
        <Button type={ButtonTypes.PRIMARY} label="Save Map" />
        <Button type={ButtonTypes.PRIMARY} label="Load Map" />
      </div>
      {renderMapInformation({ gameState })}

    </div>
  );
};

/**
 * 
 * @param {Object} params
 * @param {Types.GameState} params.gameState
 * @returns {JSX.Element}
 */
const renderMapInformation = ({ gameState }) => {
  console.log('Game state is', gameState);
  if (!gameState || !gameState.mapState) {
    return <h1>Map Information</h1>;
  }

  <div className={Styles.mapInformation}>
    <h1>Map Information</h1>
    <div className={Styles.mapInfoItem}>
      <span>Cell Width</span>
      <span>{gameState.mapState.unscaledMapBounds.x}</span>
    </div>
  </div>
};