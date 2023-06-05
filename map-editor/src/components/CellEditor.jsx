import React, { useState, useEffect } from 'react';
import * as Types from 'map-editor/types';
import { Button, ButtonTypes } from './Button';
import { Dropdown } from './Dropdown';
import { TextureSelectorModal } from './TextureSelectorModal';
import { getTextureById, getTextureIds, TextureTypes, TextureTypeLabels } from 'map-editor/services/textures';
// @ts-ignore
import Styles from './CellEditor.css';

const textureAttachSelectOptions = Object.values(TextureTypes).map((textureType) => ({
  id: textureType, label: TextureTypeLabels[textureType],
}));

/**
 * 
 * @param {Object} params
 * @param {Types.MapCell} params.cameraFocusCell
 * @param {Types.MapCell} params.cameraPositionCell
 * @param {function} params.onReplaceTexture
 * @returns 
 */
export const CellEditor = ({ cameraFocusCell, cameraPositionCell, onReplaceTexture }) => {
  if (!cameraFocusCell || !cameraPositionCell) {
    return null;
  }

  const [textureTypeToSelect, setTextureTypeToSelect] = useState('');
  const [selectedAttachTextureType, setSelectedAttachTextureType] = useState(TextureTypes.WALL);
  const [showAttachedTextureModal, setShowAttachedTextureModal] = useState(false);
  const [attachedTexture, setAttachedTexture] = useState(null);

  // Handle attached texture painting.
  useEffect(() => {
    if (!attachedTexture) {
      return;
    }

    const { textureId, selectedAttachTextureType } = attachedTexture;
    console.log('Attached texture', attachedTexture);
    if ((selectedAttachTextureType === TextureTypes.CEILING && cameraPositionCell.ceilingTextureId !== textureId) ||
        (selectedAttachTextureType === TextureTypes.FLOOR && cameraPositionCell.floorTextureId !== textureId) ||
        (selectedAttachTextureType === TextureTypes.WALL && cameraFocusCell.wallTextureId !== textureId)) {
      onReplaceTexture({ textureType: selectedAttachTextureType, textureId });
    }
  }, [cameraFocusCell, cameraPositionCell])

  const onNewTextureSelected = ({ textureId }) => {
    onReplaceTexture({ textureType: textureTypeToSelect, textureId });
    setTextureTypeToSelect('');
  }
  
  const wallTexture = getTextureById({ id: cameraFocusCell.wallTextureId });
  const floorTexture = cameraPositionCell?.floorTextureId && getTextureById({ id: cameraPositionCell.floorTextureId });
  const ceilingTexture = cameraPositionCell?.ceilingTextureId && getTextureById({ id: cameraPositionCell.ceilingTextureId });

  return (
    <div className={Styles.cellEditor}>
      {textureTypeToSelect && (
        <TextureSelectorModal 
          textureIds={getTextureIds()}
          onConfirm={onNewTextureSelected}
          onCancel={() => setTextureTypeToSelect('')} />
      )}
      {showAttachedTextureModal && (
        <TextureSelectorModal 
          textureIds={getTextureIds()}
          onConfirm={({ textureId }) => {
            setAttachedTexture({ textureId, selectedAttachTextureType });
            setShowAttachedTextureModal(false);
          }}
          onCancel={() => attachedTexture(null)} />
      )}
      <div className={Styles.commandPanel}>
        <Dropdown selectedOptionId={selectedAttachTextureType} options={textureAttachSelectOptions} onChange={setSelectedAttachTextureType} isDisabled={!!attachedTexture}/>
        {!attachedTexture && <Button type={ButtonTypes.PRIMARY} label="Attach to Texture" onClick={() => setShowAttachedTextureModal(true)}/> }
        {attachedTexture && <Button type={ButtonTypes.PRIMARY} label="Detach from Texture" onClick={() => setAttachedTexture(null)}/> }
        <Button type={ButtonTypes.PRIMARY} label='Add Wall at Location' onClick={() => {}}/>
      </div>
      <div className={Styles.texturePanel}>
        <div className={Styles.textureDisplay}>
          <h1>Wall Texture</h1>
          <img src={wallTexture.baseImage.src} onClick={() => setTextureTypeToSelect(TextureTypes.WALL)}/>
        </div>
        <div className={Styles.textureDisplay}>
          <h1>Floor Texture</h1>
          {floorTexture && <img src={floorTexture.baseImage.src} onClick={() => setTextureTypeToSelect(TextureTypes.FLOOR)}/>}
        </div>
        <div className={Styles.textureDisplay}>
          <h1>Ceiling Texture</h1>
          {ceilingTexture && <img src={ceilingTexture.baseImage.src} onClick={() => setTextureTypeToSelect(TextureTypes.CEILING)}/>}
        </div>
      </div>
    </div>
  );
};