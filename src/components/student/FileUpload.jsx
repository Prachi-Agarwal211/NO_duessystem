'use client';

import { useState } from 'react';
import { Upload, X, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function FileUpload({ 
  onFileSelect, 
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
  currentFile = null
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(currentFile);
  const [error, setError] = useState('');

  const validateFile = (file) => {
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
      return false;
    }
    
    const acceptedTypes = accept.split(',').map(t => t.trim());
    const fileType = file.type;
    const isValid = acceptedTypes.some(type => {
      if (type === 'image/*') return fileType.startsWith('image/');
      return fileType === type;
    });

    if (!isValid) {
      setError('Invalid file type');
      return false;
    }

    setError('');
    return true;
  };

  const handleFile = (file) => {
    if (!file) return;
    
    if (validateFile(file)) {
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target.result);
        };
        reader.readAsDataURL(file);
      }
      
      onFileSelect(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setPreview(null);
    setError('');
    onFileSelect(null);
  };

  return (
    <div className="w-full">
      <label className={`block text-sm font-medium mb-2 transition-colors duration-700 ease-smooth
        ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Alumni Verification Screenshot (Optional)
      </label>

      {preview ? (
        <div className={`relative rounded-lg overflow-hidden border transition-all duration-700 ease-smooth
          ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={clearFile}
              className={`p-2 rounded-full backdrop-blur-md transition-all duration-300
                ${isDark 
                  ? 'bg-white/10 hover:bg-white/20 text-white' 
                  : 'bg-black/10 hover:bg-black/20 text-black'
                }`}
            >
              <X size={16} />
            </button>
            <div className={`p-2 rounded-full backdrop-blur-md
              ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-600'}`}>
              <Check size={16} />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-700 ease-smooth cursor-pointer
            ${dragActive 
              ? 'border-jecrc-red bg-jecrc-red/10' 
              : isDark 
                ? 'border-white/20 hover:border-jecrc-red/50 bg-white/5 hover:bg-white/10' 
                : 'border-black/20 hover:border-jecrc-red/50 bg-white hover:bg-gray-50'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <Upload 
            className={`mx-auto mb-4 transition-colors duration-700 ease-smooth
              ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            size={32}
          />
          
          <p className={`text-sm font-medium mb-1 transition-colors duration-700 ease-smooth
            ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Click to upload or drag and drop
          </p>
          
          <p className={`text-xs transition-colors duration-700 ease-smooth
            ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            PNG, JPG, JPEG up to {maxSize / (1024 * 1024)}MB
          </p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}