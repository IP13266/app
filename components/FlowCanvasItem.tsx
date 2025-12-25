import React, { useEffect, useRef } from 'react';
import { WorkflowStatus } from '../types';
import type { WorkItem } from '../types';

interface FlowCanvasItemProps {
  item: WorkItem;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  onPreview?: (url: string) => void;
}

export const FlowCanvasItem: React.FC<FlowCanvasItemProps> = ({ item, onRetry, onRemove, onPreview }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Smart Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el && item.status === WorkflowStatus.ANALYZING) {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isAtBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [item.originalPrompt, item.status]);

  const Arrow = ({ active, label }: { active: boolean, label: string }) => (
    <div className="flex flex-col items-center justify-center mx-2 w-16 md:w-24 shrink-0 transition-opacity duration-300">
      <div className={`text-[10px] uppercase font-bold mb-1 tracking-widest ${active ? 'text-blue-400' : 'text-gray-600'}`}>
        {label}
      </div>
      <div className="relative w-full h-8 flex items-center">
        {/* Line */}
        <div className="w-full h-0.5 bg-gray-700"></div>
        {/* Animated Line overlay */}
        <div className={`absolute top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 w-full origin-left transition-transform duration-300 ${active ? 'scale-x-100 animate-pulse' : 'scale-x-0'}`}></div>
        {/* Arrowhead */}
        <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 transform rotate-45 ${active ? 'border-purple-500' : 'border-gray-700'}`}></div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 relative overflow-hidden group hover:bg-gray-800/80 transition-all shadow-xl">
      {/* Background Status Indicator */}
      <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-500
        ${item.status === WorkflowStatus.COMPLETED ? 'bg-green-500' : ''}
        ${item.status === WorkflowStatus.ERROR ? 'bg-red-500' : ''}
        ${item.status === WorkflowStatus.ANALYZING || item.status === WorkflowStatus.GENERATING ? 'bg-blue-500 animate-pulse' : 'bg-gray-700'}
      `} />

      {/* Delete / Retry Controls (Top Right) */}
      <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {item.status === WorkflowStatus.ERROR && onRetry && (
          <button 
            onClick={() => onRetry(item.id)}
            className="p-2 bg-blue-900/50 hover:bg-blue-600 text-blue-200 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            RETRY
          </button>
        )}
        {onRemove && (
           <button 
             onClick={() => onRemove(item.id)}
             className="p-2 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg transition-colors"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        )}
      </div>

      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 pl-4">
        
        {/* NODE 1: INPUT */}
        <div className="flex flex-col gap-2 w-full xl:w-64 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Input Source</span>
          </div>
          <div 
            className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-700 bg-gray-900 shadow-inner group-hover:border-gray-600 transition-colors cursor-pointer"
            onClick={() => onPreview && onPreview(item.previewUrl)}
          >
            <img 
              src={item.previewUrl} 
              alt="Input" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-xs text-gray-500 truncate text-center font-mono">{item.file.name}</div>
        </div>

        {/* CONNECTOR 1 */}
        <div className="hidden xl:block">
           <Arrow 
             active={item.status === WorkflowStatus.ANALYZING || item.status === WorkflowStatus.GENERATING || item.status === WorkflowStatus.COMPLETED} 
             label="Vision API"
            />
        </div>

        {/* NODE 2: PROMPT ENGINEERING (Streaming Text) */}
        <div className="flex flex-col gap-2 w-full shrink min-w-0 h-64 xl:h-auto self-stretch">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {item.status === WorkflowStatus.ANALYZING ? 'Stream Logic...' : 'Context / Prompt'}
            </span>
          </div>
          <div 
            ref={scrollRef}
            className={`flex-1 min-h-[160px] xl:h-full bg-black/40 border border-gray-700 rounded-xl p-4 font-mono text-sm overflow-y-auto custom-scrollbar relative transition-all duration-300
             ${item.status === WorkflowStatus.ANALYZING ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : ''}
            `}
          >
            {item.originalPrompt ? (
               <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                 {item.originalPrompt}
                 {item.status === WorkflowStatus.ANALYZING && (
                    <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse align-middle"></span>
                 )}
               </div>
            ) : (
               <div className="flex items-center justify-center h-full text-gray-600 italic">
                 {item.status === WorkflowStatus.PENDING ? 'Waiting for analysis...' : 'Analysis failed.'}
               </div>
            )}
            
            {item.error && (
               <div className="mt-4 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs">
                 Error: {item.error}
               </div>
            )}
          </div>
        </div>

        {/* CONNECTOR 2 */}
        <div className="hidden xl:block">
           <Arrow 
             active={item.status === WorkflowStatus.GENERATING || item.status === WorkflowStatus.COMPLETED} 
             label="Gen API"
            />
        </div>

        {/* NODE 3: OUTPUT */}
        <div className="flex flex-col gap-2 w-full xl:w-64 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Output Result</span>
            {item.status === WorkflowStatus.COMPLETED && (
               <span className="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded-full">DONE</span>
            )}
          </div>
          <div className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-gray-900 shadow-inner flex items-center justify-center
            ${item.status === WorkflowStatus.GENERATING ? 'border-purple-500 animate-pulse' : 'border-gray-700'}
            ${item.status === WorkflowStatus.COMPLETED ? 'border-green-500' : ''}
          `}>
             {item.generatedImageUrl ? (
                <div className="w-full h-full relative group/img">
                   <div 
                      className="w-full h-full cursor-pointer" 
                      onClick={() => onPreview && onPreview(item.generatedImageUrl!)}
                   >
                     <img src={item.generatedImageUrl} className="w-full h-full object-cover" alt="Result" />
                   </div>
                   
                   {/* Separate Download Button */}
                   <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <a 
                        href={item.generatedImageUrl} 
                        download={`refine-${item.file.name}`}
                        className="bg-gray-900/80 hover:bg-blue-600 text-white p-2 rounded-lg backdrop-blur flex items-center justify-center shadow-lg transition-colors border border-gray-700"
                        title="Download Image"
                        onClick={(e) => e.stopPropagation()}
                      >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </a>
                   </div>
                   
                   {/* Zoom/Preview Hint */}
                   <div 
                      className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/20"
                   >
                     <div className="bg-black/50 px-3 py-1 rounded text-xs text-white backdrop-blur">
                        Click to Zoom
                     </div>
                   </div>
                </div>
             ) : (
                <div className="text-center p-4">
                   {item.status === WorkflowStatus.GENERATING ? (
                      <div className="flex flex-col items-center gap-2">
                         <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                         <span className="text-xs text-purple-400">Rendering...</span>
                      </div>
                   ) : (
                      <span className="text-xs text-gray-700 font-bold uppercase">Waiting</span>
                   )}
                </div>
             )}
          </div>
          <div className="text-xs text-gray-500 text-center font-mono h-4">
             {item.status === WorkflowStatus.COMPLETED ? 'Generation Complete' : ''}
          </div>
        </div>

      </div>
    </div>
  );
};