import React, { useCallback } from 'react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const files = (Array.from(e.dataTransfer.files) as File[]).filter((file) =>
        file.type.startsWith('image/')
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = (Array.from(e.target.files) as File[]).filter((file) =>
        file.type.startsWith('image/')
      );
      onFilesSelected(files);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-gray-800 transition-colors cursor-pointer group"
    >
      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        id="file-upload"
        onChange={handleFileInput}
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
        <svg
          className="w-16 h-16 text-gray-400 group-hover:text-blue-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-xl font-medium text-gray-300">
          Drop images here or click to upload
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Supports JPG, PNG, WebP
        </p>
      </label>
    </div>
  );
};