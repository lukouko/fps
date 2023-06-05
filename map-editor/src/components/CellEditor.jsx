import React, { useState, useEffect } from 'react';
import * as Types from 'map-editor/types';
import { WallCreator } from './WallCreator';
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
 * @param {Types.MapCell} params.focusCell
 * @param {Types.Position} params.focusPosition
 * @param {Types.MapCell} params.cameraCell
 * @param {Types.Position} params.cameraPosition
 * @param {function} params.onReplaceTextureAt
 * @returns 
 */
export const CellEditor = ({ focusCell, focusPosition, cameraCell, cameraPosition, onReplaceTextureAt }) => {
  if (!focusCell || !focusPosition || !cameraCell || !cameraPosition) {
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

    if ((selectedAttachTextureType === TextureTypes.CEILING && cameraCell.ceilingTextureId !== textureId) ||
        (selectedAttachTextureType === TextureTypes.FLOOR && cameraCell.floorTextureId !== textureId) ||
        (selectedAttachTextureType === TextureTypes.WALL && focusCell.wallTextureId !== textureId)) {
      onReplaceTexture({ textureType: selectedAttachTextureType, textureId });
    }

  }, [focusPosition, focusCell, cameraPosition, cameraCell ]);

  const onNewTextureSelected = ({ textureId }) => {
    onReplaceTexture({ textureType: textureTypeToSelect, textureId });
    setTextureTypeToSelect('');
  };

  const onReplaceTexture = ({ textureType, textureId }) => {
    const position = textureType === TextureTypes.WALL ? focusPosition : cameraPosition;
    onReplaceTextureAt({ position, textureType, textureId });
  };
  
  const wallTexture = getTextureById({ id: focusCell.wallTextureId });
  const floorTexture = cameraCell.floorTextureId && getTextureById({ id: cameraCell.floorTextureId });
  const ceilingTexture = cameraCell.ceilingTextureId && getTextureById({ id: cameraCell.ceilingTextureId });

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
            onReplaceTexture({ textureType: selectedAttachTextureType, textureId });
            setShowAttachedTextureModal(false);
          }}
          onCancel={() => setShowAttachedTextureModal(false)} />
      )}
      <div className={Styles.commandPanel}>
        <Dropdown selectedOptionId={selectedAttachTextureType} options={textureAttachSelectOptions} onChange={setSelectedAttachTextureType} isDisabled={!!attachedTexture}/>
        {!attachedTexture && <Button type={ButtonTypes.PRIMARY} label="Attach to Texture" onClick={() => setShowAttachedTextureModal(true)}/> }
        {attachedTexture && <Button type={ButtonTypes.PRIMARY} label="Detach from Texture" onClick={() => setAttachedTexture(null)}/> }
        
      </div>
      <div className={Styles.wallCreatorPanel}>
        <h1>Wall Creation</h1>
        <WallCreator cell={cameraCell} position={cameraPosition} onReplaceTextureAt={onReplaceTextureAt} />
      </div>
      <div className={Styles.texturePanel}>
        <div className={Styles.textureDisplay}>
          <h2>Wall Texture</h2>
          <img src={wallTexture.baseImage.src} onClick={() => setTextureTypeToSelect(TextureTypes.WALL)}/>
        </div>
        <div className={Styles.textureDisplay}>
          <h2>Floor Texture</h2>
          {floorTexture && <img src={floorTexture.baseImage.src} onClick={() => setTextureTypeToSelect(TextureTypes.FLOOR)}/>}
        </div>
        <div className={Styles.textureDisplay}>
          <h2>Ceiling Texture</h2>
          {ceilingTexture && <img src={ceilingTexture.baseImage.src} onClick={() => setTextureTypeToSelect(TextureTypes.CEILING)}/>}
        </div>
      </div>
    </div>
  );
};