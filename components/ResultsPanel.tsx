
import React from 'react';
import { ParsedOrders, Detection, LogEntry, Score } from '../types';
import { STATUS_COLORS, ICONS } from '../constants';

interface ResultsPanelProps {
  parsedOrders: ParsedOrders | null;
  detections: Detection[];
  logs: LogEntry[];
  score: Score | null;
}

const LogLine: React.FC<{ log: LogEntry }> = ({ log }) => {
  const color = {
    info: 'text-brand-text-dim',
    success: 'text-brand-success',
    error: 'text-brand-danger',
    warning: 'text-brand-warning',
  }[log.type];
  return (
    <div className={`flex text-xs ${color}`}>
      <span className="w-20 shrink-0">{log.timestamp}</span>
      <span className="flex-1">{log.message}</span>
    </div>
  );
};


export const ResultsPanel: React.FC<ResultsPanelProps> = ({ parsedOrders, detections, logs, score }) => {
  return (
    <div className="bg-brand-surface h-full rounded-lg p-4 flex flex-col space-y-4 overflow-hidden">
      <h2 className="text-lg font-bold border-b border-brand-surface-light pb-2">Mission Intel & Logs</h2>
      
      <div className="bg-brand-bg p-3 rounded-md border border-brand-surface-light">
        <h3 className="font-semibold mb-2 text-brand-text-dim">Parsed Orders</h3>
        {parsedOrders ? (
          <div className="text-xs space-y-1">
            <p><span className="font-bold text-green-400">TARGETS:</span> {parsedOrders.targets.join(', ') || 'NONE'}</p>
            <p><span className="font-bold text-red-400">PROTECTED:</span> {parsedOrders.protected.join(', ') || 'NONE'}</p>
          </div>
        ) : <p className="text-xs text-brand-text-dim italic">Awaiting orders parsing...</p>}
      </div>

      <div className="flex-1 bg-brand-bg p-3 rounded-md border border-brand-surface-light flex flex-col min-h-0">
        <h3 className="font-semibold mb-2 text-brand-text-dim">Detections ({detections.length})</h3>
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {detections.length > 0 ? detections.map(det => {
              const style = det.isProtected ? STATUS_COLORS.protected : det.isTarget ? STATUS_COLORS.target : STATUS_COLORS.neutral;
              return (
              <div key={det.id} className={`p-2 rounded-md border ${style.border} ${style.bg} text-xs`}>
                  <div className="flex justify-between items-center font-bold">
                      <span className={`${style.text} capitalize`}>{det.species}</span>
                      <span className="text-brand-text-dim">{(det.confidence * 100).toFixed(1)}%</span>
                  </div>
              </div>
          )}) : <p className="text-xs text-brand-text-dim italic">Awaiting detection run...</p>}
        </div>
      </div>
      
      {score && (
          <div className="bg-brand-bg p-3 rounded-md border border-brand-surface-light">
             <h3 className="font-semibold mb-2 text-brand-text-dim">Engagement Score</h3>
             <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-brand-surface p-2 rounded">
                    <p className="text-2xl font-bold text-brand-success">{score.total}</p>
                    <p className="text-xs text-brand-text-dim">Total Score</p>
                </div>
                <div className="bg-brand-surface p-2 rounded">
                    <p className="text-2xl font-bold text-green-400">{score.hits}</p>
                    <p className="text-xs text-brand-text-dim">Hits</p>
                </div>
                 <div className="bg-brand-surface p-2 rounded">
                    <p className="text-2xl font-bold text-red-400">{score.collateral}</p>
                    <p className="text-xs text-brand-text-dim">Collateral</p>
                </div>
                 <div className="bg-brand-surface p-2 rounded">
                    <p className="text-2xl font-bold text-yellow-400">{score.misses}</p>
                    <p className="text-xs text-brand-text-dim">Misses</p>
                </div>
             </div>
          </div>
      )}

      <div className="flex-1 bg-black p-3 rounded-md flex flex-col min-h-0">
         <h3 className="font-semibold mb-2 text-brand-text-dim">System Log</h3>
         <div className="flex-1 overflow-y-auto space-y-1">
             {logs.slice().reverse().map((log, i) => <LogLine key={i} log={log} />)}
         </div>
      </div>

    </div>
  );
};
