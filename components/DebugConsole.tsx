import React, { useEffect, useRef } from 'react';
import type { SystemLog } from '../types';

interface DebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SystemLog[];
  onClear: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ isOpen, onClose, logs, onClear }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 h-[40vh] bg-black/95 border-t border-gray-700 shadow-2xl z-50 flex flex-col font-mono text-sm transition-transform duration-300">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-green-400 font-bold">SYSTEM TERMINAL</span>
          <span className="text-gray-500 text-xs">{logs.length} events</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onClear} 
            className="text-gray-400 hover:text-white hover:bg-gray-800 px-2 py-1 rounded transition-colors text-xs uppercase"
          >
            Clear
          </button>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-gray-800 px-2 py-1 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Log Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {logs.length === 0 && (
          <div className="text-gray-600 italic text-center mt-10">No system logs recorded.</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="border-l-2 pl-3 py-1 text-xs md:text-sm animate-fade-in break-words"
            style={{ 
              borderColor: log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#22c55e' : log.type === 'warning' ? '#f59e0b' : '#3b82f6' 
            }}
          >
            <div className="flex gap-2 text-gray-500 mb-0.5">
              <span>[{log.timestamp.toLocaleTimeString()}]</span>
              <span className={`font-bold uppercase ${
                log.type === 'error' ? 'text-red-500' : 
                log.type === 'success' ? 'text-green-500' : 
                log.type === 'warning' ? 'text-yellow-500' : 'text-blue-400'
              }`}>
                {log.type}
              </span>
            </div>
            <div className="text-gray-300 whitespace-pre-wrap">{log.message}</div>
            {log.details && (
              <div className="mt-2 bg-gray-900 p-2 rounded border border-gray-800 overflow-x-auto">
                <pre className="text-gray-400 text-[10px] leading-tight">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};