import React from 'react';

/**
 * フィルターコンポーネント
 * ドロップダウンや日付選択などの共通フィルター機能を提供
 */
const Filter = ({
  type = 'select',
  label,
  value,
  onChange,
  options = [],
  placeholder = '選択してください',
  className = '',
  labelClassName = 'w3-text-white w3-small',
  disabled = false,
  required = false,
  style = {}
}) => {
  const baseSelectClass = `
    w3-select w3-border w3-round w3-margin-left
    ${disabled ? 'w3-disabled' : ''}
    ${className}
  `.trim();
  const renderSelect = () => (
    <select
      className={baseSelectClass}
      style={style}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
    >
      {placeholder && (
        <option value="">{placeholder}</option>
      )}
      {options.map((option, index) => (
        <option key={option.value || index} value={option.value || option}>
          {option.label || option}
        </option>
      ))}
    </select>
  );
  const renderDateInput = () => (
    <input
      type="date"
      className={`w3-input w3-border w3-round w3-margin-left ${className}`}
      style={style}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
    />
  );

  const renderNumberInput = () => (
    <input
      type="number"
      className={`w3-input w3-border w3-round w3-margin-left ${className}`}
      style={style}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
    />
  );

  const renderTextInput = () => (
    <input
      type="text"
      className={`w3-input w3-border w3-round w3-margin-left ${className}`}
      style={style}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
    />
  );

  const renderInput = () => {
    switch (type) {
      case 'select':
        return renderSelect();
      case 'date':
        return renderDateInput();
      case 'number':
        return renderNumberInput();
      case 'text':
        return renderTextInput();
      default:
        return renderSelect();
    }
  };

  return (
    <div className="w3-margin-top">
      {label && (
        <label className={labelClassName}>{label}:</label>
      )}
      {renderInput()}
    </div>
  );
};

export default Filter;
