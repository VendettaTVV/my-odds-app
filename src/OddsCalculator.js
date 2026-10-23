import React, { useState, useEffect } from 'react';
import { Calculator, Percent, TrendingUp, Activity } from 'lucide-react';

function OddsCalculator({ method }) {
  const [homeValue, setHomeValue] = useState(1.5);
  const [awayValue, setAwayValue] = useState(1.1);
  const [probs, setProbs] = useState({ home: 0, draw: 0, away: 0 });
  const [heatmap, setHeatmap] = useState([]);
  const [eloSensitivity, setEloSensitivity] = useState({ home: [], away: [] });
  const [sensTarget, setSensTarget] = useState('home');

  useEffect(() => {
    setHomeValue(method === 'poisson' ? 1.5 : 1500);
    setAwayValue(method === 'poisson' ? 1.1 : 1450);
  }, [method]);

  useEffect(() => {
    if (method === 'poisson') {
      const factorial = (n) => (n === 0 || n === 1 ? 1 : n * factorial(n - 1));
      const poissonProb = (k, lambda) => (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);

      let hProb = 0, dProb = 0, aProb = 0;
      const matrix = [];
      
      for (let i = 0; i <= 4; i++) {
        const row = [];
        for (let j = 0; j <= 4; j++) {
          const prob = poissonProb(i, parseFloat(homeValue) || 0) * poissonProb(j, parseFloat(awayValue) || 0);
          row.push(prob);
          if (i > j) hProb += prob;
          else if (i === j) dProb += prob;
          else aProb += prob;
        }
        matrix.push(row);
      }
      const total = hProb + dProb + aProb;
      setProbs({ home: hProb / total, draw: dProb / total, away: aProb / total });
      setHeatmap(matrix);

    } else {
      const calcEloOdds = (h, a) => {
        const eloDiff = (h + 100) - a; 
        const pHome = 1 / (1 + Math.pow(10, -(eloDiff - 60) / 400)); 
        const pAway = 1 / (1 + Math.pow(10, (eloDiff + 60) / 400));
        const pDraw = 1 - pHome - pAway;
        return { home: pHome, draw: pDraw > 0 ? pDraw : 0, away: pAway };
      };

      const baseHome = parseFloat(homeValue) || 1500;
      const baseAway = parseFloat(awayValue) || 1500;
      
      setProbs(calcEloOdds(baseHome, baseAway));

      const shifts = [+30, +15, 0, -15, -30];
      setEloSensitivity({
        home: shifts.map(shift => ({
          shift,
          newElo: baseHome + shift,
          odds: calcEloOdds(baseHome + shift, baseAway)
        })),
        away: shifts.map(shift => ({
          shift,
          newElo: baseAway + shift,
          odds: calcEloOdds(baseHome, baseAway + shift)
        }))
      });
    }
  }, [method, homeValue, awayValue]);

  const toOdds = (prob) => (prob > 0 ? (1 / prob).toFixed(2) : '0.00');
  const toPercent = (prob) => (prob * 100).toFixed(1);

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-white uppercase tracking-wide">
          {method === 'poisson' ? 'Poisson Match Predictor' : 'ELO Market Pricing'}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-900 p-4 rounded-md border border-gray-700">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Home Team {method === 'poisson' ? 'xG (Expected Goals)' : 'ELO Rating'}
          </label>
          <input
            type="number"
            step={method === 'poisson' ? "0.1" : "1"}
            value={homeValue}
            onChange={(e) => setHomeValue(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Away Team {method === 'poisson' ? 'xG (Expected Goals)' : 'ELO Rating'}
          </label>
          <input
            type="number"
            step={method === 'poisson' ? "0.1" : "1"}
            value={awayValue}
            onChange={(e) => setAwayValue(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'HOME (1)', prob: probs.home, color: 'text-green-400' },
          { label: 'DRAW (X)', prob: probs.draw, color: 'text-yellow-400' },
          { label: 'AWAY (2)', prob: probs.away, color: 'text-red-400' }
        ].map((outcome, idx) => (
          <div key={idx} className="bg-gray-900 border border-gray-700 p-4 rounded-md text-center flex flex-col items-center justify-center">
            <span className="text-gray-400 text-xs tracking-widest mb-1">{outcome.label}</span>
            <span className={`text-3xl font-bold ${outcome.color} mb-1`}>{toOdds(outcome.prob)}</span>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Percent size={12} /> {toPercent(outcome.prob)}%
            </div>
          </div>
        ))}
      </div>

      {method === 'poisson' && (
        <div className="mt-6 border-t border-gray-700 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-blue-400" size={18} />
            <h3 className="text-md font-semibold text-gray-200">Correct Score Matrix (0-4)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border border-gray-700 bg-gray-900 text-gray-400">Home \ Away</th>
                  {[0, 1, 2, 3, 4].map(goals => (
                    <th key={goals} className="p-2 border border-gray-700 bg-gray-900 text-gray-400">{goals}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.map((row, i) => (
                  <tr key={i}>
                    <th className="p-2 border border-gray-700 bg-gray-900 text-gray-400">{i}</th>
                    {row.map((prob, j) => {
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
      )}

      {method === 'elo' && (
        <div className="mt-6 border-t border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="text-blue-400" size={18} />
              <h3 className="text-md font-semibold text-gray-200">Odds Sensitivity Matrix</h3>
            </div>
            <div className="flex space-x-2 bg-gray-900 p-1 rounded border border-gray-700">
              <button 
                onClick={() => setSensTarget('home')}
                className={`px-3 py-1 text-xs font-medium rounded ${sensTarget === 'home' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Home ELO
              </button>
              <button 
                onClick={() => setSensTarget('away')}
                className={`px-3 py-1 text-xs font-medium rounded ${sensTarget === 'away' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Away ELO
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border border-gray-700 bg-gray-900 text-gray-400">ELO Shift</th>
                  <th className="p-2 border border-gray-700 bg-gray-900 text-gray-400">New Rating</th>
                  <th className="p-2 border border-gray-700 bg-gray-900 text-green-400">Home (1)</th>
                  <th className="p-2 border border-gray-700 bg-gray-900 text-yellow-400">Draw (X)</th>
                  <th className="p-2 border border-gray-700 bg-gray-900 text-red-400">Away (2)</th>
                </tr>
              </thead>
              <tbody>
                {eloSensitivity[sensTarget].map((row, i) => (
                  <tr key={i} className={row.shift === 0 ? 'bg-gray-700' : 'bg-gray-800'}>
                    <td className="p-2 border border-gray-700 font-mono font-bold text-gray-200">
                      {row.shift > 0 ? `+${row.shift}` : row.shift}
                    </td>
                    <td className="p-2 border border-gray-700 font-mono text-gray-300">{row.newElo}</td>
                    <td className="p-2 border border-gray-700 font-mono text-gray-300">{toOdds(row.odds.home)}</td>
                    <td className="p-2 border border-gray-700 font-mono text-gray-300">{toOdds(row.odds.draw)}</td>
                    <td className="p-2 border border-gray-700 font-mono text-gray-300">{toOdds(row.odds.away)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default OddsCalculator;