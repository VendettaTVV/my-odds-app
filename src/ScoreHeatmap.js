import React from 'react';
import { TrendingUp } from 'lucide-react';

const DISPLAY_GOALS = 4;
const toPercent = (prob) => (prob * 100).toFixed(1);

/** Correct-score probabilities 0-4 goals; the full 0-10 grid is used for the 1X2 prices. */
function ScoreHeatmap({ matrix }) {
  const goals = [...Array(DISPLAY_GOALS + 1).keys()];

  return (
    <div className="mt-6 border-t border-gray-700 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="text-blue-400" size={18} />
        <h3 className="text-md font-semibold text-gray-200">Correct Score Matrix (Display 0-4, Integrated 0-10)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2 border border-gray-700 bg-gray-900 text-gray-400">Home \ Away</th>
              {goals.map((g) => (
                <th key={g} className="p-2 border border-gray-700 bg-gray-900 text-gray-400">{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goals.map((i) => (
              <tr key={i}>
                <th className="p-2 border border-gray-700 bg-gray-900 text-gray-400">{i}</th>
                {goals.map((j) => {
                  const prob = matrix[i][j];
                  // 20%+ is fully saturated
                  const alpha = Math.min(prob * 5, 1);
                  return (
                    <td
                      key={j}
                      className="p-2 border border-gray-700 font-mono text-gray-200"
                      style={{ backgroundColor: `rgba(59, 130, 246, ${alpha})` }}
                    >
                      {toPercent(prob)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ScoreHeatmap;
