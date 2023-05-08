import React, { useState } from 'react';
import { Modal } from './Modal';
import Styles from './Form.css';

export const NewMapModal = ({ onConfirm, onCancel }) => {
  const [newMapConfig, setNewMapConfig] = useState({
    width: '',
    height: '',
  });

  const onFieldChange = (fieldName) => (changeEvent) => {
    setNewMapConfig({
      ...newMapConfig,
      [fieldName]: changeEvent.target.value,
    });
  };

  const confirmNewMapConfig = () => {
    onConfirm({
      width: Number(newMapConfig.width),
      height: Number(newMapConfig.height),
    });
  };

  return (
    <Modal title="Create New Map" onConfirm={confirmNewMapConfig} onCancel={onCancel} showConfirm showCancel>
      <div className={Styles.form}>
        <fieldset>
          <div className={Styles.formRow}>
            <label>Number of Cells Wide</label>
            <input type="number" min="1" step="1" value={newMapConfig.width} onChange={onFieldChange('width')}/>
          </div>
          <div className={Styles.formRow}>
            <label>Number of Cells High</label>
            <input type="number" min="1" step="1" value={newMapConfig.height} onChange={onFieldChange('height')}/>
          </div>
        </fieldset>
      </div>
    </Modal>
  );
};
