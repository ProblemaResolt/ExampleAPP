import React from 'react';
import FormField from '../common/FormField';
import ActionButtons from '../common/ActionButtons';

/**
 * 汎用フォームコンポーネント
 */
const Form = ({ 
  fields = [],
  values = {},
  errors = {},
  onChange,
  onSubmit,
  onCancel,
  submitLabel = '保存',
  cancelLabel = 'キャンセル',
  isSubmitting = false,
  className = ""
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(values);
    }
  };

  const handleFieldChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(field.name, value);
  };

  const actions = [
    {
      type: 'primary',
      label: submitLabel,
      onClick: handleSubmit,
      disabled: isSubmitting
    }
  ];

  if (onCancel) {
    actions.unshift({
      type: 'secondary',
      label: cancelLabel,
      onClick: onCancel,
      disabled: isSubmitting
    });
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="w3-container">
        {fields.map((field) => (
          <FormField
            key={field.name}
            {...field}
            value={values[field.name] || ''}
            error={errors[field.name]}
            onChange={handleFieldChange(field)}
          />
        ))}
        
        <div className="w3-margin-top w3-margin-bottom">
          <ActionButtons 
            actions={actions}
            size="medium"
          />
        </div>
      </div>
    </form>
  );
};

export default Form;
