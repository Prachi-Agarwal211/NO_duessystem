import React from 'react';

const FormInput = ({ 
  label, 
  id, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  required = false, 
  error, 
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium mb-2 text-gray-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-3 bg-white/10 border rounded-lg focus:outline-none focus:ring-2 text-white ${
          error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-white/20 focus:ring-blue-500'
        }`}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};

export default FormInput;