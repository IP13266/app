import React from 'react';
import { WorkflowStatus } from '../types';
import type { WorkItem } from '../types';

interface WorkItemCardProps {
  item: WorkItem;
}

export const WorkItemCard: React.FC<WorkItemCardProps> = ({ item }) => {
  const getStatusColor = (status: WorkflowStatus) => {
    switch (status) {
      case WorkflowStatus.COMPLETED:
        return 'border-green-500 bg-gray-800';
      case WorkflowStatus.ERROR:
        return 'border-red-500 bg-gray-800';
      case WorkflowStatus.ANALYZING:
      case WorkflowStatus.GENERATING:
        return 'border-blue-500 bg-gray-800 animate-pulse';
      case WorkflowStatus.PENDING:
      default:
        return 'border-gray-700 bg-gray-800 opacity-70';
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden flex flex-col md:flex-row h-full ${getStatusColor(item.status)} transition-all duration-300`}>
      {/* Original Image */}
      <div className="w-full md:w-1/3 relative h-48 md:h-auto bg-black">
        <img
          src={item.previewUrl}
          alt="Original"
          className="absolute inset-0 w-full h-full object-contain"
        />
        <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 text-xs rounded text-white">
          Original
        </div>
      </div>

      {/* Info & Logs */}
      <div className="flex-1 p-4 flex flex-col justify-between border-t md:border-t-0 md:border-l md:border-r border-gray-700 min-h-[200px]">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm truncate max-w-[200px]" title={item.file.name}>
              {item.file.name}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full uppercase font-bold tracking-wider
              ${item.status === WorkflowStatus.COMPLETED ? 'bg-green-900 text-green-200' : ''}
              ${item.status === WorkflowStatus.ERROR ? 'bg-red-900 text-red-200' : ''}
              ${item.status === WorkflowStatus.PENDING ? 'bg-gray-700 text-gray-300' : ''}
              ${(item.status === WorkflowStatus.ANALYZING || item.status === WorkflowStatus.GENERATING) ? 'bg-blue-900 text-blue-200' : ''}
            `}>
              {item.status}
            </span>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[120px] pr-2 text-xs font-mono">
            {item.progressLog.map((log, idx) => (
              <div key={idx} className="text-gray-400">
                &gt; {log}
              </div>
            ))}
            {item.error && (
              <div className="text-red-400 font-bold">
                Error: {item.error}
              </div>
            )}
          </div>
        </div>

        {item.originalPrompt && (
          <div className="mt-4 bg-gray-900 p-2 rounded text-xs text-gray-300 border border-gray-700">
            <span className="text-gray-500 block mb-1">Detected Prompt:</span>
            <p className="line-clamp-3 hover:line-clamp-none cursor-help transition-all">
              {item.originalPrompt}
            </p>
          </div>
        )}
      </div>

      {/* Result Image */}
      <div className="w-full md:w-1/3 relative h-48 md:h-auto bg-black border-t md:border-t-0 border-gray-700">
        {item.generatedImageUrl ? (
          <a href={item.generatedImageUrl} download={`processed-${item.file.name}`} className="block h-full w-full cursor-pointer group relative">
             <img
              src={item.generatedImageUrl}
              alt="Generated"
              className="absolute inset-0 w-full h-full object-contain"
            />
             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="bg-white text-black px-3 py-1 rounded font-medium text-sm">Download</span>
             </div>
          </a>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-600 text-sm">
            {item.status === WorkflowStatus.ERROR ? 'Failed' : 'Waiting for result...'}
          </div>
        )}
        <div className="absolute top-2 right-2 bg-blue-600/90 px-2 py-1 text-xs rounded text-white font-medium">
          GenAI Result
        </div>
      </div>
    </div>
  );
};