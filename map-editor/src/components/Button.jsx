import React from 'react';
import classnames from 'classnames';
// @ts-ignore
import Styles from './Button.css';

export const ButtonTypes = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
});

const buttonStyleLookup = Object.freeze({
  [ButtonTypes.PRIMARY]: Styles.primary,
  [ButtonTypes.SECONDARY]: Styles.secondary,
});

export const Button = ({ label, type, onClick, isDisabled = false }) => {
  const noop = () => {};

  return (
    <button className={classnames(Styles.button, buttonStyleLookup[type], isDisabled && Styles.disabled)} onClick={isDisabled ? noop : onClick}>{label}</button>
  );
};