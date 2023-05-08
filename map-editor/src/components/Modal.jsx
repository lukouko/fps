import React from 'react';
import { Button, ButtonTypes } from './Button';
// @ts-ignore
import Styles from './Modal.css';

export const Modal = ({ title, children, showConfirm = false, showCancel = false, confirmLabel='OK', cancelLabel='Cancel', onConfirm = () => {}, onCancel = () => {} }) => {
  return (
    <div className={Styles.modal}>
      <div className={Styles.modalContainer}>
        <div className={Styles.modalContainerHeader}>
          <h1 className={Styles.modalContainerTitle}>{title}</h1>
        </div>
        <div className={Styles.modalContainerBody}>
          {children}
        </div>
        <div className={Styles.modalContainerFooter}>
          {showCancel && <Button type={ButtonTypes.SECONDARY} label={cancelLabel} onClick={onCancel} />}
          {showConfirm && <Button type={ButtonTypes.PRIMARY} label={confirmLabel} onClick={onConfirm} />}
        </div>
      </div>
    </div>
  );
};
