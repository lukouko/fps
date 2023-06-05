import React from 'react';
import classnames from 'classnames';
// @ts-ignore
import Styles from './Dropdown.css';

/**
 * @typedef {Object} DropDownOption
 * @property {string|number} id
 * @property {string} label 
 */

/**
 * @param {Object} params
 * @param {Array<DropDownOption>} params.options
 * @param {string|undefined} params.selectedOptionId
 * @param {Function} params.onChange
 * @param {boolean} [params.isDisabled]
 * @returns {JSX.Element}
 */
export const Dropdown = ({ options, selectedOptionId, onChange, isDisabled = false }) => {
  return (
    <select 
      className={Styles.dropdown}
      name="select" 
      disabled={isDisabled}
      value={selectedOptionId}
      // @ts-ignore
      onChange={(evt) => onChange(evt.target.value, evt)}
    >
      {options.map(({ id, label}) => (
        <option key={id} value={id}>{label}</option>
      ))}
    </select>
  );
};
