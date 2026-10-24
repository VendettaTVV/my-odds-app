import React, { useState, useEffect } from 'react';
import { Calculator, Percent, TrendingUp, Activity, Database } from 'lucide-react';

function OddsCalculator({ method }) {
  const [homeValue, setHomeValue] = useState(1.5);
  const [awayValue, setAwayValue] = useState(1.1);
  const [margin, setMargin] = useState(5);
  const [probs, setProbs] = useState({ home: 0, draw: 0, away: 0 });
  const [heatmap, setHeatmap] = useState([]);
  const [eloSensitivity, setEloSensitivity] = useState({ home: [], away: [] });
  const [sensTarget, setSensTarget] = useState('home');

  // Стейты для данных из Python
  const [teamsData, setTeamsData] = useState(null); // Poisson (xG)
  const [eloData, setEloData] = useState(null);     // ELO Ratings
  const [selectedHome, setSelectedHome] = useState('');
  const [selectedAway, setSelectedAway] = useState('');

  // Загрузка JSON при монтировании
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/data/teams.json')
      .then(res => res.json())
      .then(data => {
        setTeamsData(data);
        const teamNames = Object.keys(data);
        if (teamNames.length >= 2) {
          setSelectedHome(teamNames[0]);
          setSelectedAway(teamNames[1]);
        }
      })
      .catch(err => console.log('Poisson data not found'));

    fetch(process.env.PUBLIC_URL + '/data/elo.json')
      .then(res => res.json())
      .then(data => setEloData(data))
      .catch(err => console.log('ELO data not found'));
  }, []);

  // Авто-пересчет при смене команд или метода
  useEffect(() => {
    if (method === 'poisson' && teamsData && selectedHome && selectedAway) {
      const homeAtk = teamsData[selectedHome]?.attack_xg || 1.5;
      const awayDef = teamsData[selectedAway]?.defense_xg || 1.1;
      const awayAtk = teamsData[selectedAway]?.attack_xg || 1.1;
      const homeDef = teamsData[selectedHome]?.defense_xg || 1.1;
      setHomeValue(((homeAtk + awayDef) / 2).toFixed(2));
      setAwayValue(((awayAtk + homeDef) / 2).toFixed(2));
    } else if (method === 'elo' && eloData && selectedHome && selectedAway) {
      setHomeValue(eloData[selectedHome] || 1500);
      setAwayValue(eloData[selectedAway] || 1500);
    }
  }, [selectedHome, selectedAway, method, teamsData, eloData]);

  // Основная математика
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

  const toOddsWithMargin = (prob) => {
    if (prob <= 0) return '0.00';
    const m = (parseFloat(margin) || 0) / 100;
    return (1 / (prob * (1 + m))).toFixed(2);
  };
  const toPercent = (prob) => (prob * 100).toFixed(1);

  const hasData = (method === 'poisson' && teamsData) || (method === 'elo' && eloData);
  const dataKeys = hasData ? (method === 'poisson' ? Object.keys(teamsData).sort() : Object.keys(eloData).sort()) : [];

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        {hasData ? <Database className="text-blue-400" size={24} /> : <Calculator className="text-blue-400" size={24} />}
        <h2 className="text-xl font-bold text-white uppercase tracking-wide">
          {method === 'poisson' ? 'Poisson Match Predictor (Live Data)' : 'ELO Market Pricing (Live Data)'}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8 bg-gray-900 p-4 rounded-md border border-gray-700">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Home Team {method === 'poisson' ? '(Auto xG)' : '(Auto ELO)'}
          </label>
          {hasData ? (
            <select
              value={selectedHome}
              onChange={(e) => setSelectedHome(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              {dataKeys.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
          ) : (
            <input
              type="number"
              step={method === 'poisson' ? "0.1" : "1"}
              value={homeValue}
              onChange={(e) => setHomeValue(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Away Team {method === 'poisson' ? '(Auto xG)' : '(Auto ELO)'}
          </label>
          {hasData ? (
            <select
              value={selectedAway}
              onChange={(e) => setSelectedAway(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              {dataKeys.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
          ) : (
            <input
              type="number"
              step={method === 'poisson' ? "0.1" : "1"}
              value={awayValue}
              onChange={(e) => setAwayValue(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Bookmaker Margin (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className="w-full bg-gray-800 text-blue-300 font-bold border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
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
            <span className={`text-3xl font-bold ${outcome.color} mb-1`}>{toOddsWithMargin(outcome.prob)}</span>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Percent size={12} /> {toPercent(outcome.prob)}%
            </div>
          </div>
        ))}
      </div>

      {method === 'poisson' && (
        <div className="mt-6 border-t border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={18} />
              <h3 className="text-md font-semibold text-gray-200">Correct Score Matrix (0-4)</h3>
            </div>
            {hasData && (
              <div className="text-xs text-gray-400 bg-gray-900 px-3 py-1 rounded border border-gray-700">
                Data driven by Python SQL Pipeline
              </div>
            )}
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
              <h3 className="text-md font-semibold text-gray-200">Odds Sensitivity Matrix (with {margin}% margin)</h3>
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
                    <td className="p-2 border border-gray-700 font-mono text-gray-300">{toOddsWithMargin(row.odds.home)}</td>
                    <td className="p-2 border border-gray-700 font-mono text-gray-300">{toOddsWithMargin(row.odds.draw)}</td>
                    <td className="p-2 border border-gray-700 font-mono text-gray-300">{toOddsWithMargin(row.odds.away)}</td>
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