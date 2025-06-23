import React from 'react';

/**
 * 汎用フォームフィールドコンポーネント
 */
const FormField = ({ 
  type = 'text',
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  disabled = false,
  options = [], // selectの場合
  rows = 3, // textareaの場合
  className = "",
  inputClassName = "",
  ...props
}) => {
  const renderInput = () => {
    const baseInputClass = `w3-input w3-border ${error ? 'w3-border-red' : ''} ${inputClassName}`;
    
    switch (type) {
      case 'select':
        return (
          <select
            className={baseInputClass}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            {...props}
          >
            <option value="">{placeholder || '選択してください'}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            className={baseInputClass}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            {...props}
          />
        );
      
      case 'checkbox':
        return (
          <input
            className="w3-check"
            type="checkbox"
            name={name}
            checked={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            {...props}
          />
        );
      
      default:
        return (
          <input
            className={baseInputClass}
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            {...props}
          />
        );
    }
  };

  return (
    <div className={`w3-margin-bottom ${className}`}>
      {label && (
        <label className="w3-text-dark-gray">
          {label}
          {required && <span className="w3-text-red"> *</span>}
        </label>
      )}
      
      {type === 'checkbox' ? (
        <div className="w3-margin-top">
          {renderInput()}
          {label && <span className="w3-margin-left">{label}</span>}
        </div>
      ) : (
        renderInput()
      )}
      
      {error && (
        <div className="w3-text-red w3-small w3-margin-top">
          {error}
        </div>
      )}
    </div>
  );
};

export default FormField;
