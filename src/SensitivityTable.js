import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { OUTCOMES, OUTCOME_META } from './outcomes';
import { eloSensitivity, oddsWithMargin } from './pricing';

/** Shows how the priced odds move if one team's rating is over- or under-estimated. */
function SensitivityTable({ homeElo, awayElo, params, marginPct }) {
  const [side, setSide] = useState('home');
  const rows = eloSensitivity(homeElo, awayElo, params, side);

  const tabClass = (value) =>
    `px-3 py-1 text-xs font-medium rounded ${side === value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`;

  return (
    <div className="mt-6 border-t border-gray-700 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-400" size={18} />
          <h3 className="text-md font-semibold text-gray-200">Odds Sensitivity Matrix</h3>
        </div>
        <div className="flex space-x-2 bg-gray-900 p-1 rounded border border-gray-700">
          <button onClick={() => setSide('home')} className={tabClass('home')}>Home ELO</button>
          <button onClick={() => setSide('away')} className={tabClass('away')}>Away ELO</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2 border border-gray-700 bg-gray-900 text-gray-400">Shift</th>
              <th className="p-2 border border-gray-700 bg-gray-900 text-gray-400">New Rating</th>
              {OUTCOMES.map((o) => (
                <th key={o} className={`p-2 border border-gray-700 bg-gray-900 ${OUTCOME_META[o].color}`}>
                  {OUTCOME_META[o].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.shift} className={row.shift === 0 ? 'bg-gray-700' : 'bg-gray-800'}>
                <td className="p-2 border border-gray-700 font-mono font-bold text-gray-200">
                  {row.shift > 0 ? `+${row.shift}` : row.shift}
                </td>
                <td className="p-2 border border-gray-700 font-mono text-gray-300">{Math.round(row.newElo)}</td>
                {OUTCOMES.map((o) => (
                  <td key={o} className="p-2 border border-gray-700 font-mono text-gray-300">
                    {oddsWithMargin(row.probs[o], marginPct).toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SensitivityTable;
