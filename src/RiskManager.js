import React from 'react';
import { DollarSign } from 'lucide-react';
import { OUTCOMES, OUTCOME_META } from './outcomes';

const formatMoney = (value) => `${value > 0 ? '+' : value < 0 ? '-' : ''}$${Math.abs(value).toFixed(2)}`;

/** Betting volumes, recommended and manual odds, and bookmaker P&L for each outcome. */
function RiskManager({ volumeInputs, onVolumeChange, suggested, oddsInputs, onOddsChange, pnl, totalVolume, realMargin }) {
  return (
    <div className="mt-8 border-2 border-dashed border-gray-600 p-5 rounded-lg bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="text-green-400" size={20} />
          <h3 className="text-lg font-bold text-gray-200">Risk Manager: Liability & Balancing</h3>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="text-gray-400 bg-gray-800 px-3 py-1 rounded border border-gray-700">
            Total Pool: ${totalVolume.toFixed(2)}
          </div>
          <div className="text-blue-300 bg-gray-800 px-3 py-1 rounded border border-gray-700 font-mono">
            Book Overround: {(100 + realMargin).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-center">
        {OUTCOMES.map((o) => (
          <div key={o} className="flex flex-col gap-2 bg-gray-800 p-3 rounded border border-gray-700">
            <label htmlFor={`volume-${o}`} className="text-gray-400 text-xs uppercase font-bold">
              Money on {OUTCOME_META[o].short}
            </label>
            <input
              id={`volume-${o}`}
              type="number"
              min="0"
              value={volumeInputs[o]}
              onChange={(e) => onVolumeChange(o, e.target.value)}
              className="w-full bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-center"
            />

            <div className="flex justify-between items-center mt-2 border-b border-gray-700 pb-1">
              <span className="text-gray-500 text-xs uppercase">Recommended:</span>
              <span className="text-blue-400 font-mono font-bold">{suggested[o].toFixed(2)}</span>
            </div>

            <label htmlFor={`odds-${o}`} className="text-gray-400 text-xs uppercase mt-1">Manual Odds</label>
            <input
              id={`odds-${o}`}
              type="number"
              step="0.01"
              value={oddsInputs[o]}
              onChange={(e) => onOddsChange(o, e.target.value)}
              className="w-full bg-gray-900 text-blue-300 font-bold border border-gray-600 rounded px-2 py-1 text-center"
            />

            <div className={`mt-2 p-2 rounded font-mono font-bold border ${pnl[o] < 0 ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'}`}>
              P&L: {formatMoney(pnl[o])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RiskManager;
