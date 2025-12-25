import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateId, delay } from './services/utils';
import { describeImage, generateVariation } from './services/geminiService';
import { UploadZone } from './components/UploadZone';
import { FlowCanvasItem } from './components/FlowCanvasItem';
import { SettingsModal } from './components/SettingsModal';
import { DebugConsole } from './components/DebugConsole';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { WorkflowStatus } from './types';
import type { WorkItem, ProcessingStats, AppSettings, SystemLog } from './types';

// Default configuration with Gemini models
const DEFAULT_SETTINGS: AppSettings = {
  analysisConfig: {
    apiKey: '',
    baseUrl: '', // Empty means use official Google API
    model: 'gemini-3-flash-preview', 
    systemInstruction: 'Analyze the image and write a high-quality stable diffusion style prompt (tags or natural language) to recreate it. Focus on subject, medium, lighting, and style.',
  },
  generationConfig: {
    apiKey: '',
    baseUrl: '', // Empty means use default (or custom fallback in service)
    model: 'gemini-3-pro-image-preview',
    aspectRatio: '16:9',
    systemInstruction: 'Generate a high-fidelity image based on the provided description.',
  }
};

const App: React.FC = () => {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Refs to handle processing loop state without stale closures
  const isProcessingRef = useRef(false);
  const itemsRef = useRef<WorkItem[]>([]);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);

  // Sync ref with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Logging Helper
  const addLog = useCallback((type: SystemLog['type'], message: string, details?: any) => {
    const newLog: SystemLog = {
      id: generateId(),
      timestamp: new Date(),
      type,
      message,
      details
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    const newItems: WorkItem[] = files.map((file) => ({
      id: generateId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: WorkflowStatus.PENDING,
      progressLog: ['Queued for processing...'],
    }));
    setItems((prev) => [...prev, ...newItems]);
    addLog('info', `Added ${files.length} files to queue.`);
  }, [addLog]);

  const updateItem = (id: string, updates: Partial<WorkItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter(item => item.id !== id));
  };

  const handleRetryItem = (id: string) => {
    updateItem(id, { 
      status: WorkflowStatus.PENDING, 
      error: undefined,
      generatedImageUrl: undefined,
      originalPrompt: undefined,
      progressLog: ['Retrying...']
    });
    addLog('info', `Retrying item ${id}`);
  };

  const handleAspectRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRatio = e.target.value;
    setSettings(prev => ({
      ...prev,
      generationConfig: {
        ...prev.generationConfig,
        aspectRatio: newRatio
      }
    }));
    addLog('info', `Aspect Ratio changed to ${newRatio}`);
  };

  const handleBatchDownload = () => {
    const completedItems = items.filter(item => item.status === WorkflowStatus.COMPLETED && item.generatedImageUrl);
    if (completedItems.length === 0) {
      addLog('warning', 'No completed images to download.');
      return;
    }

    addLog('info', `Starting batch download for ${completedItems.length} images...`);
    
    // Sequential download with delay to prevent browser blocking
    completedItems.forEach((item, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = item.generatedImageUrl!;
        link.download = `batch-${index + 1}-${item.file.name.split('.')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500); // 500ms delay between downloads
    });
  };

  const processQueue = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    addLog('info', 'Queue processing started.');

    try {
      let currentIndex = itemsRef.current.findIndex(
        (item) => item.status === WorkflowStatus.PENDING
      );

      while (currentIndex !== -1 && isProcessingRef.current) {
        const currentItem = itemsRef.current[currentIndex];
        addLog('info', `Processing Item: ${currentItem.file.name} (${currentItem.id})`);

        try {
          // 1. Mark as Analyzing
          updateItem(currentItem.id, { status: WorkflowStatus.ANALYZING, originalPrompt: '' });

          // 2. Call Vision API (Streaming)
          addLog('info', `[Step 1] Sending to Vision API...`);
          const description = await describeImage(
            currentItem.file, 
            settingsRef.current.analysisConfig,
            (partialText) => {
              updateItem(currentItem.id, { originalPrompt: partialText });
            }
          );
          
          updateItem(currentItem.id, { originalPrompt: description });
          addLog('success', `[Step 1] Analysis complete.`);

          // 3. Mark as Generating
          updateItem(currentItem.id, { status: WorkflowStatus.GENERATING });
          addLog('info', `[Step 2] Sending to Image Gen API (Ratio: ${settingsRef.current.generationConfig.aspectRatio || 'Default'})...`);

          // 4. Call Image API
          const generatedImage = await generateVariation(currentItem.file, description, settingsRef.current.generationConfig);
          
          // 5. Complete
          updateItem(currentItem.id, {
            status: WorkflowStatus.COMPLETED,
            generatedImageUrl: generatedImage,
          });
          addLog('success', `[Step 2] Image generation successful.`);

        } catch (error: any) {
          console.error(error);
          const errorMsg = error.message || 'Unknown error occurred';
          addLog('error', `Failed processing ${currentItem.file.name}: ${errorMsg}`, error);
          
          updateItem(currentItem.id, {
            status: WorkflowStatus.ERROR,
            error: errorMsg,
          });
        }

        await delay(500);

        currentIndex = itemsRef.current.findIndex(
          (item) => item.status === WorkflowStatus.PENDING
        );
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      addLog('info', 'Queue processing finished or stopped.');
    }
  };

  const stopProcessing = () => {
    isProcessingRef.current = false;
    setIsProcessing(false);
    addLog('warning', 'Processing stopped by user.');
  };

  const clearCompleted = () => {
    if (isProcessing) return;
    setItems((prev) => prev.filter(item => item.status !== WorkflowStatus.COMPLETED && item.status !== WorkflowStatus.ERROR));
    addLog('info', 'Cleared completed/error items.');
  };

  const resetAll = () => {
      if (isProcessing) return;
      setItems([]);
      addLog('warning', 'All items reset.');
  }

  // Calculate Stats
  const stats: ProcessingStats = items.reduce(
    (acc, item) => {
      acc.total++;
      if (item.status === WorkflowStatus.COMPLETED) acc.completed++;
      if (item.status === WorkflowStatus.ERROR) acc.failed++;
      if (item.status === WorkflowStatus.PENDING) acc.pending++;
      return acc;
    },
    { total: 0, completed: 0, failed: 0, pending: 0 }
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0f16] text-gray-100 font-sans relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <ImagePreviewModal 
        isOpen={!!previewImage} 
        imageUrl={previewImage} 
        onClose={() => setPreviewImage(null)} 
      />

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        currentSettings={settings}
        onSave={(newSettings) => {
          setSettings(newSettings);
          setShowSettings(false);
          addLog('info', 'Settings updated.');
        }}
      />

      <DebugConsole 
        isOpen={showDebug} 
        onClose={() => setShowDebug(false)} 
        logs={logs}
        onClear={() => setLogs([])}
      />

      {/* Header */}
      <header className="flex-none p-6 border-b border-gray-800 bg-[#0a0f16]/95 backdrop-blur z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
             <div className="flex items-center gap-2">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                  PromptFusion Canvas
                </h1>
             </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Aspect Ratio Selector (Main Page) */}
             <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700 px-3 py-1.5">
               <span className="text-[10px] text-gray-500 uppercase font-bold mr-2">Ratio</span>
               <select
                  value={settings.generationConfig.aspectRatio || '16:9'}
                  onChange={handleAspectRatioChange}
                  className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
                >
                  <option value="16:9">16:9</option>
                  <option value="1:1">1:1</option>
                  <option value="9:16">9:16</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                  <option value="21:9">21:9</option>
                </select>
             </div>

            <div className="hidden lg:flex items-center space-x-6 bg-gray-900 rounded-full px-6 py-2 border border-gray-800 shadow-xl">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Queue</span>
                <span className="font-mono font-bold text-white text-sm">{stats.pending}</span>
              </div>
              <div className="w-px h-6 bg-gray-800"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-green-500 uppercase font-bold tracking-wider">Ready</span>
                <span className="font-mono font-bold text-green-400 text-sm">{stats.completed}</span>
              </div>
            </div>

            <button 
              onClick={() => setShowSettings(true)}
              className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl transition-all border border-gray-700 hover:border-blue-500 shadow-lg"
              title="Configure Nodes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content (Canvas) */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth z-10">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          {items.length === 0 && (
            <div className="max-w-2xl mx-auto mt-20 fade-in-up">
               <UploadZone onFilesSelected={handleFilesSelected} />
               <div className="text-center mt-12">
                   <h3 className="text-gray-400 font-medium mb-4 uppercase tracking-widest text-xs">Workflow Architecture</h3>
                   <div className="flex items-center justify-center gap-4 text-gray-600">
                       <div className="flex flex-col items-center gap-2">
                           <div className="w-12 h-12 rounded-lg border-2 border-gray-700 flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                           <span className="text-[10px] uppercase">Input</span>
                       </div>
                       <div className="h-0.5 w-12 bg-gray-700"></div>
                       <div className="flex flex-col items-center gap-2">
                           <div className="w-12 h-12 rounded-lg border-2 border-blue-900/50 bg-blue-900/10 flex items-center justify-center text-blue-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></div>
                           <span className="text-[10px] uppercase">Vision</span>
                       </div>
                       <div className="h-0.5 w-12 bg-gray-700"></div>
                       <div className="flex flex-col items-center gap-2">
                           <div className="w-12 h-12 rounded-lg border-2 border-purple-900/50 bg-purple-900/10 flex items-center justify-center text-purple-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg></div>
                           <span className="text-[10px] uppercase">Generate</span>
                       </div>
                   </div>
               </div>
            </div>
          )}

          {items.length > 0 && (
             <div className="flex flex-col gap-6">
                {items.map((item) => (
                  <FlowCanvasItem 
                    key={item.id} 
                    item={item} 
                    onRetry={handleRetryItem}
                    onRemove={handleRemoveItem}
                    onPreview={(url) => setPreviewImage(url)}
                  />
                ))}
             </div>
          )}
        </div>
      </main>

      {/* Footer Controls */}
      {items.length > 0 && (
        <footer className="flex-none bg-gray-900/80 backdrop-blur border-t border-gray-700 p-6 sticky bottom-0 z-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center space-x-2">
                <button 
                  onClick={resetAll}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  Reset All
                </button>
                 <button 
                  onClick={clearCompleted}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  Clear Completed
                </button>
                <button 
                  onClick={handleBatchDownload}
                  disabled={isProcessing || stats.completed === 0}
                  className="px-4 py-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-30 transition-colors font-medium"
                >
                  Download All
                </button>
                <button 
                  onClick={() => setShowDebug(!showDebug)}
                  className={`px-4 py-2 text-sm transition-colors border border-dashed rounded ${showDebug ? 'text-blue-400 border-blue-500 bg-blue-900/30' : 'text-gray-500 border-gray-700 hover:text-gray-300'}`}
                >
                  Debug Console {logs.some(l => l.type === 'error') && '🔴'}
                </button>
             </div>

             <div className="flex items-center space-x-4">
                 <div className="relative">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if(e.target.files) handleFilesSelected(Array.from(e.target.files));
                        e.target.value = '';
                      }}
                    />
                    <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2 border border-gray-700">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                       <span>Add</span>
                    </button>
                 </div>

                {!isProcessing ? (
                  <button
                    onClick={processQueue}
                    disabled={stats.pending === 0}
                    className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all transform hover:scale-105 flex items-center space-x-2
                      ${stats.pending === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                    `}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Execute Workflow</span>
                  </button>
                ) : (
                  <button
                    onClick={stopProcessing}
                    className="bg-red-600 hover:bg-red-500 text-white border border-red-400 px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center space-x-2 animate-pulse"
                    title="Click to Stop Immediately"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    <span>STOP</span>
                  </button>
                )}
             </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;