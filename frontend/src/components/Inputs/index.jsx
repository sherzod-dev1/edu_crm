import React, { useState } from 'react';
import styles from './inputs.module.css';
import { Eye, EyeOff } from 'lucide-react';

const Inputs = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error,
  hint,
  required = false,
  disabled = false,
  icon: Icon,
  className = '',
  as = 'input',
  rows = 4,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`${styles.wrapper} ${error ? styles.hasError : ''} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <div className={styles.inputContainer}>
        {Icon && (
          <span className={styles.iconLeft}>
            <Icon size={18} />
          </span>
        )}

        {as === 'textarea' ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={`${styles.input} ${styles.textarea} ${Icon ? styles.hasIconLeft : ''}`}
            {...props}
          />
        ) : (
          <input
            id={name}
            name={name}
            type={inputType}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`${styles.input} ${Icon ? styles.hasIconLeft : ''} ${
              isPassword ? styles.hasIconRight : ''
            }`}
            {...props}
          />
        )}

        {isPassword && (
          <button
            type="button"
            className={styles.iconRight}
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && <span className={styles.errorMessage}>{error}</span>}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
    </div>
  );
};

export default Inputs;
