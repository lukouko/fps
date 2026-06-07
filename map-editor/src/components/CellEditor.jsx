import React, { useState, useEffect } from 'react';
import classnames from 'classnames';
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

const LIGHT_COLOR_PRESETS = [
  { label: 'None',  color: null },
  { label: 'Warm',  color: { r: 255, g: 195, b: 120 } },
  { label: 'Cool',  color: { r: 160, g: 200, b: 255 } },
  { label: 'Red',   color: { r: 255, g: 80,  b: 80  } },
  { label: 'Green', color: { r: 80,  g: 200, b: 100 } },
  { label: 'Soft',  color: { r: 255, g: 230, b: 195 } },
];

const lcToHex = ({ r, g, b }) =>
  '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');

const hexToLc = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

// Preview texture shown on cells while ceiling removal is being drafted.
const DRAFT_CEILING_REMOVAL_TEXTURE_ID = 'under_construction';

// Module-level map of cells currently marked for ceiling removal, keyed by "x:y".
// Mirrors the WallCreator pattern — reset when removal mode exits.
let draftCeilingRemovals = {};

/**
 *
 * @param {Object} params
 * @param {Types.MapCell} params.focusCell
 * @param {Types.Position} params.focusPosition
 * @param {Types.MapCell} params.cameraCell
 * @param {Types.Position} params.cameraPosition
 * @param {function} params.onReplaceTextureAt
 * @param {function} params.onRemoveTextureAt Called with ({ position, textureType }) to clear a texture from a cell.
 * @param {function} params.onCreateWalls
 * @returns {JSX.Element}
 */
export const CellEditor = ({ focusCell, focusPosition, cameraCell, cameraPosition, onReplaceTextureAt, onRemoveTextureAt, onCreateWalls, onSetLightColorAt }) => {
  if (!focusCell || !focusPosition || !cameraCell || !cameraPosition) {
    return null;
  }

  const [textureTypeToSelect, setTextureTypeToSelect] = useState('');
  const [selectedAttachTextureType, setSelectedAttachTextureType] = useState(TextureTypes.WALL);
  const [showAttachedTextureModal, setShowAttachedTextureModal] = useState(false);
  const [attachedTexture, setAttachedTexture] = useState(null);
  const [isDraftingCeilingRemoval, setIsDraftingCeilingRemoval] = useState(false);
  const [isCeilingRemovalPaused, setIsCeilingRemovalPaused] = useState(false);

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

  }, [focusPosition, focusCell, cameraPosition, cameraCell]);

  // While drafting ceiling removal, mark each cell the camera enters with the preview texture.
  // Only applies to walkable cells that actually have a ceiling — wall cells and already-sky cells are skipped.
  useEffect(() => {
    if (!isDraftingCeilingRemoval || isCeilingRemovalPaused) return;
    if (!cameraCell || !cameraPosition) return;
    if (cameraCell.wallTextureId || !cameraCell.ceilingTextureId) return;

    const id = `${cameraPosition.x}:${cameraPosition.y}`;
    if (draftCeilingRemovals[id]) return;

    draftCeilingRemovals[id] = {
      position: { ...cameraPosition },
      originalCeilingTextureId: cameraCell.ceilingTextureId,
    };

    onReplaceTextureAt({ position: cameraPosition, textureType: TextureTypes.CEILING, textureId: DRAFT_CEILING_REMOVAL_TEXTURE_ID });
  }, [cameraPosition, cameraCell, isDraftingCeilingRemoval, isCeilingRemovalPaused]);

  const onNewTextureSelected = ({ textureId }) => {
    onReplaceTexture({ textureType: textureTypeToSelect, textureId });
    setTextureTypeToSelect('');
  };

  const onReplaceTexture = ({ textureType, textureId }) => {
    const position = textureType === TextureTypes.WALL ? focusPosition : cameraPosition;
    onReplaceTextureAt({ position, textureType, textureId });
  };

  const onConfirmCeilingRemoval = () => {
    Object.values(draftCeilingRemovals).forEach(({ position }) => {
      onRemoveTextureAt({ position, textureType: TextureTypes.CEILING });
    });
    setIsDraftingCeilingRemoval(false);
    setIsCeilingRemovalPaused(false);
    draftCeilingRemovals = {};
  };

  const onCancelCeilingRemoval = () => {
    Object.values(draftCeilingRemovals).forEach(({ position, originalCeilingTextureId }) => {
      onReplaceTextureAt({ position, textureType: TextureTypes.CEILING, textureId: originalCeilingTextureId });
    });
    setIsDraftingCeilingRemoval(false);
    setIsCeilingRemovalPaused(false);
    draftCeilingRemovals = {};
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
      <div className={classnames(Styles.panel, Styles.textureSelectionPanel)}>
        <div className={Styles.panelTitle}>
          <h1>Texture Selection</h1>
        </div>
        <div className={classnames(Styles.panelBody, Styles.textureSelectionPanelBody)}>
          <div className={Styles.textureDisplay}>
            <h2>Wall</h2>
            <img src={wallTexture.baseImage.src} onClick={() => setTextureTypeToSelect(TextureTypes.WALL)}/>
          </div>
          <div className={Styles.textureDisplay}>
            <h2>Floor</h2>
            {floorTexture && <img src={floorTexture.baseImage.src} onClick={() => setTextureTypeToSelect(TextureTypes.FLOOR)}/>}
          </div>
          <div className={Styles.textureDisplay}>
            <h2>Ceiling</h2>
            {ceilingTexture
              ? <img src={ceilingTexture.baseImage.src} onClick={() => setTextureTypeToSelect(TextureTypes.CEILING)}/>
              : <div className={Styles.skyPlaceholder} onClick={() => setTextureTypeToSelect(TextureTypes.CEILING)}>sky</div>
            }
          </div>
        </div>
      </div>
      <div className={classnames(Styles.panel, Styles.texturePaintingPanel)}>
        <div className={Styles.panelTitle}>
          <h1>Texture Painting</h1>
        </div>
        <div className={classnames(Styles.panelBody, Styles.texturePaintingPanelBody)}>
          <Dropdown selectedOptionId={selectedAttachTextureType} options={textureAttachSelectOptions} onChange={setSelectedAttachTextureType} isDisabled={!!attachedTexture}/>
          {!attachedTexture && <Button type={ButtonTypes.PRIMARY} label="Paint Texture" onClick={() => setShowAttachedTextureModal(true)}/> }
          {attachedTexture && <Button type={ButtonTypes.PRIMARY} label="Stop Painting Texture" onClick={() => setAttachedTexture(null)}/> }
        </div>
      </div>
      <div className={classnames(Styles.panel, Styles.wallCreationPanel)}>
        <div className={Styles.panelTitle}>
          <h1>Wall Creation</h1>
        </div>
        <div className={classnames(Styles.panelBody, Styles.wallCreationPanelBody)}>
          <WallCreator cell={cameraCell} position={cameraPosition} onReplaceTextureAt={onReplaceTextureAt} onCreateWalls={onCreateWalls}/>
        </div>
      </div>
      <div className={classnames(Styles.panel, Styles.lightColorPanel)}>
        <div className={Styles.panelTitle}>
          <h1>Light Color</h1>
        </div>
        <div className={classnames(Styles.panelBody, Styles.lightColorPanelBody)}>
          <div className={Styles.lightColorSwatches}>
            {LIGHT_COLOR_PRESETS.map(({ label, color }) => {
              const bg = color
                ? `rgb(${color.r},${color.g},${color.b})`
                : 'repeating-linear-gradient(45deg,#444 0px,#444 4px,#222 4px,#222 8px)';
              const lc = cameraCell.lightColor;
              const isActive = color === null
                ? !lc
                : lc && lc.r === color.r && lc.g === color.g && lc.b === color.b;
              return (
                <div
                  key={label}
                  className={classnames(Styles.lightColorSwatch, isActive && Styles.lightColorSwatchActive)}
                  style={{ background: bg }}
                  title={label}
                  onClick={() => onSetLightColorAt({ position: cameraPosition, lightColor: color })}
                />
              );
            })}
          </div>
          <input
            type="color"
            className={Styles.lightColorPicker}
            value={cameraCell.lightColor ? lcToHex(cameraCell.lightColor) : '#ffffff'}
            onChange={(e) => onSetLightColorAt({ position: cameraPosition, lightColor: hexToLc(e.target.value) })}
            title="Custom color"
          />
        </div>
      </div>
      <div className={classnames(Styles.panel, Styles.skyPanel)}>
        <div className={Styles.panelTitle}>
          <h1>Sky Creation</h1>
        </div>
        <div className={classnames(Styles.panelBody, Styles.skyPanelBody)}>
          {!isDraftingCeilingRemoval && (
            <Button type={ButtonTypes.PRIMARY} label="Draw Sky" onClick={() => setIsDraftingCeilingRemoval(true)} />
          )}
          {isDraftingCeilingRemoval && (
            <Button type={ButtonTypes.PRIMARY} label="Confirm Sky" onClick={onConfirmCeilingRemoval} />
          )}
          {isDraftingCeilingRemoval && !isCeilingRemovalPaused && (
            <Button type={ButtonTypes.PRIMARY} label="Pause Sky" onClick={() => setIsCeilingRemovalPaused(true)} />
          )}
          {isDraftingCeilingRemoval && isCeilingRemovalPaused && (
            <Button type={ButtonTypes.PRIMARY} label="Resume Remove" onClick={() => setIsCeilingRemovalPaused(false)} />
          )}
          {isDraftingCeilingRemoval && (
            <Button type={ButtonTypes.PRIMARY} label="Cancel Sky" onClick={onCancelCeilingRemoval} />
          )}
        </div>
      </div>
    </div>
  );
};
