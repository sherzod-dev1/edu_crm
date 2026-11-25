import React from 'react';
import styles from './select.module.css';
import { ChevronDown } from 'lucide-react';

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  // Check if options list already has an empty/placeholder option
  const hasEmptyOption = options.some(
    (opt) => opt.value === '' || opt.value === null || opt.value === undefined
  );

  return (
    <div className={`${styles.wrapper} ${error ? styles.hasError : ''} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <div className={styles.selectContainer}>
        <select
          id={name}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          className={styles.select}
          {...props}
        >
          {placeholder && !hasEmptyOption && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt, idx) => {
            const isEmpty = opt.value === '' || opt.value === null || opt.value === undefined;
            return (
              <option
                key={opt.value ?? idx}
                value={opt.value ?? ''}
                disabled={isEmpty}
              >
                {opt.label}
              </option>
            );
          })}
        </select>
        <ChevronDown size={18} className={styles.arrowIcon} />
      </div>

      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};

export default Select;
