import React, { useState, useEffect } from 'react';
import type { AppSettings, ServiceConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'generation'>('analysis');
  const [formData, setFormData] = useState<AppSettings>(currentSettings);

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      setFormData(currentSettings);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleChange = (
    section: 'analysisConfig' | 'generationConfig',
    field: keyof ServiceConfig,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const currentSectionKey = activeTab === 'analysis' ? 'analysisConfig' : 'generationConfig';
  const currentConfig = formData[currentSectionKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
          <h2 className="text-xl font-bold text-white">Workflow Configuration</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900/50">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-400 bg-gray-800/50'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
          >
            Step 1: Analysis (Vision)
          </button>
          <button
            onClick={() => setActiveTab('generation')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${
              activeTab === 'generation'
                ? 'border-purple-500 text-purple-400 bg-gray-800/50'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
          >
            Step 2: Generation (Image)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            <div className={`p-4 rounded-lg border ${activeTab === 'analysis' ? 'bg-blue-900/10 border-blue-900/30' : 'bg-purple-900/10 border-purple-900/30'}`}>
              <p className={`text-sm ${activeTab === 'analysis' ? 'text-blue-300' : 'text-purple-300'}`}>
                {activeTab === 'analysis' 
                  ? "Configure the Vision model to analyze the image." 
                  : "Configure the Image Generation model parameters."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500">Base URL <span className="text-gray-600 font-normal normal-case">(Optional)</span></label>
                <input
                  type="text"
                  value={currentConfig.baseUrl || ''}
                  onChange={(e) => handleChange(currentSectionKey, 'baseUrl', e.target.value)}
                  placeholder={activeTab === 'analysis' ? "https://api.apicore.ai/v1 (Required if using Proxy Key)" : "https://api.apicore.ai/v1"}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-600"
                />
                <p className="text-xs text-yellow-500/80">
                   {activeTab === 'analysis' 
                     ? "⚠️ If you use a Key from a reseller/proxy (e.g., apicore, api2d), you MUST fill this. Leave empty for Official Google."
                     : "Endpoint for the image generation service."}
                </p>
              </div>

               <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500">Model Name</label>
                <input
                  type="text"
                  value={currentConfig.model}
                  onChange={(e) => handleChange(currentSectionKey, 'model', e.target.value)}
                  placeholder={activeTab === 'analysis' ? "gemini-3-flash-preview" : "gemini-3-pro-image-preview"}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">API Key</label>
              <input
                type="password"
                value={currentConfig.apiKey}
                onChange={(e) => handleChange(currentSectionKey, 'apiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-600 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">System Instruction / Style Guide</label>
              <textarea
                value={currentConfig.systemInstruction || ''}
                onChange={(e) => handleChange(currentSectionKey, 'systemInstruction', e.target.value)}
                placeholder={activeTab === 'analysis' ? "You are an expert art critic..." : "Make it look like a oil painting..."}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-600 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-gray-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-900/20 transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};