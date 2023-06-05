import React, { useState } from 'react';
import { Modal } from './Modal';
import { getTextureById } from 'map-editor/services/textures';
import * as Types from 'map-editor/types';
import Styles from './TextureSelectorModal.css';
import FormStyles from './Form.css';

export const TextureSelectorModal = ({ textureIds, onConfirm, onCancel }) => {
  const confirmTextureSelection = (textureId) => {
    onConfirm({ textureId });
  };

  return (
    <Modal title="Select Texture" onCancel={onCancel} showCancel>
      <div className={FormStyles.form}>
        <fieldset>
          {textureIds.map((textureId) => {
            const texture = getTextureById({ id: textureId });
            return (
              <div key={textureId} className={FormStyles.formRow}>
                <div className={Styles.texture}>
                  <img src={texture.baseImage.src} onClick={() => confirmTextureSelection(textureId)}/>
                </div>
              </div>
            );
          })}
        </fieldset>
      </div>
    </Modal>
  );
};
