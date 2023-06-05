import React, { useState, useEffect } from 'react';
import * as Types from 'map-editor/types';
import { TextureTypes } from 'map-editor/services/textures';
import { Button, ButtonTypes } from './Button';
// @ts-ignore
import Styles from './WallCreator.css';

/**
 * @typedef {Object} DraftWall
 * @property {string} id
 * @property {Types.Position} position
 * @property {string} originalFloorTextureId
 * @property {string} originalCeilingTextureId
 */

// The texture to show on floor and ceiling in cells which are currently
// locations of draft walls.
const DRAFT_TEXTURE_ID = 'under_construction';

let draftWalls = {};

/**
 * 
 * @param {Object} params
 * @param {Types.Position} params.position
 * @param {Types.MapCell} params.cell
 * @param {function} params.onReplaceTextureAt
 * @returns 
 */
export const WallCreator = ({ position, cell, onReplaceTextureAt }) => {
  if (!position || !cell) {
    return null;
  }

  const [isDraftingWall, setIsDraftingWall] = useState(false);
  const [isDraftingPaused, setIsDraftingPaused] = useState(false);

  // Effect for setting a position and cell as a draft wall location when we are in drafting mode.
  useEffect(() => {
    if (!isDraftingWall || isDraftingPaused) {
      return;
    }

    /** @type {DraftWall} */
    const newDraftWall = {
      id: `${position.x}:${position.y}`,
      position: { ...position },
      originalFloorTextureId: cell.floorTextureId,
      originalCeilingTextureId: cell.ceilingTextureId,
    };

    draftWalls[newDraftWall.id] = newDraftWall;

    // Show the drafting texture on the floor and ceiling to indicate that the position is now a
    // draft location for a new wall.
    onReplaceTextureAt({ position, textureType: TextureTypes.CEILING, textureId: DRAFT_TEXTURE_ID });
    onReplaceTextureAt({ position, textureType: TextureTypes.FLOOR, textureId: DRAFT_TEXTURE_ID });

  }, [position, cell, isDraftingWall, isDraftingPaused]);

  // Initiates wall drafting.
  const onStartWallDrafting = () => {
    setIsDraftingWall(true);
  };

  // Scraps the draft wall changes.
  const onCancelWallDrafting = () => {
    setIsDraftingWall(false);
    
    // Return the texture of wall outline floor and ceiling back to original.
    Object.values(draftWalls).forEach(({ position, originalCeilingTextureId, originalFloorTextureId }) => {
      // Set the textures in the draft wall location back to their original values.
      onReplaceTextureAt({ position, textureType: TextureTypes.CEILING, textureId: originalCeilingTextureId });
      onReplaceTextureAt({ position, textureType: TextureTypes.FLOOR, textureId: originalFloorTextureId });
    });

    // Clear the wall points.
    draftWalls = {};
  };

  return (
    <div className={Styles.wallCreator}>
      {!isDraftingWall && <Button type={ButtonTypes.PRIMARY} label="Draw Wall" onClick={() => onStartWallDrafting()} />}
      {isDraftingWall && <Button type={ButtonTypes.PRIMARY} label="Confirm Wall" onClick={() => onCancelWallDrafting()} />}
      {isDraftingWall && !isDraftingPaused && <Button type={ButtonTypes.PRIMARY} label="Pause Drawing" onClick={() => setIsDraftingPaused(true)} />}
      {isDraftingWall && isDraftingPaused && <Button type={ButtonTypes.PRIMARY} label="Resume Drawing" onClick={() => setIsDraftingPaused(false)} />}
      {isDraftingWall && <Button type={ButtonTypes.PRIMARY} label='Cancel Wall' isDisabled={!isDraftingWall} onClick={onCancelWallDrafting} />}
    </div>
  )
}