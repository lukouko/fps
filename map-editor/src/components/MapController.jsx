import React, { useState, useRef } from 'react';
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
  const hiddenLinkRef = useRef();

  const handleNewMapRequested = (newMapConfig) => {
    onNewMapRequested(newMapConfig);
    setShowNewMapModal(false);
  };

  const handleSaveMapRequested = () => {
    /** @type HTMLAnchorElement */
    const a = hiddenLinkRef.current;
    if (!a) {
      throw new Error(`Hidden download link element unavailable`);
    }

    const mapFileBlob = new Blob([JSON.stringify(gameState.mapState.currentMap, null, 2)], {
      type: 'application/json',
    });

    const mapFileUrl = URL.createObjectURL(mapFileBlob);
    a.href = mapFileUrl;
    a.download = 'saved-map.json';
    a.click();

    URL.revokeObjectURL(mapFileUrl);
  };

  return (
    <div className={Styles.mapController}>
      <a className={Styles.hiddenDownloadLink} ref={hiddenLinkRef} />
      {showNewMapModal && <NewMapModal onConfirm={handleNewMapRequested} onCancel={() => setShowNewMapModal(false)} />}
      <div className={Styles.mapFileMenu}>
        <Button type={ButtonTypes.PRIMARY} label="New Map" onClick={() => setShowNewMapModal(true)}/>
        <Button type={ButtonTypes.PRIMARY} label="Save Map" onClick={() => handleSaveMapRequested()} />
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
  if (!gameState || !gameState.mapState) {
    return <h1>Map Information</h1>;
  }

  return (
    <div className={Styles.mapInformation}>
      <h1>Map Information</h1>
      <div className={Styles.mapInfoItem}>
        <span className={Styles.title}>Cell Width:</span>
        <span className={Styles.value}>{gameState.mapState.unscaledMapBounds.x}</span>
      </div>
      <div className={Styles.mapInfoItem}>
        <span className={Styles.title}>Cell Height:</span>
        <span className={Styles.value}>{gameState.mapState.unscaledMapBounds.y}</span>
      </div>
      <div className={Styles.mapInfoItem}>
        <span className={Styles.title}>Scaled Width:</span>
        <span className={Styles.value}>{gameState.mapState.scaledMapBounds.x}</span>
      </div>
      <div className={Styles.mapInfoItem}>
        <span className={Styles.title}>Scaled Height:</span>
        <span className={Styles.value}>{gameState.mapState.scaledMapBounds.y}</span>
      </div>
    </div>
  );
};