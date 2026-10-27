import React, { useState, useEffect } from 'react';
import { Calculator, Percent, TrendingUp, Activity, Database, DollarSign } from 'lucide-react';

// Model calibration constants
const HOME_ADV = 40;          // ELO Home Field Advantage calibrated from historical data
const ELO_DRAW_MARGIN = 60;   // ELO draw width parameter (Davidson extension)
const DC_RHO = -0.10;         // Dixon-Coles low-score correlation parameter for 0:0, 1:0, 0:1, 1:1
const LEAGUE_AVG_XG = 1.35;   // League average expected goals per team for Maher's multiplier model

/**
 * OddsCalculator Component
 * Functions as a professional quantitative trading terminal for match pricing and risk management.
 * Supports both Poisson Distribution (with Dixon-Coles correction) and ELO Rating System.
 */
function OddsCalculator({ method }) {
  const [homeValue, setHomeValue] = useState(1.5);
  const [awayValue, setAwayValue] = useState(1.1);
  const [margin, setMargin] = useState(5);
  const [probs, setProbs] = useState({ home: 0, draw: 0, away: 0 });
  const [heatmap, setHeatmap] = useState([]);
  const [eloSensitivity, setEloSensitivity] = useState({ home: [], away: [] });
  const [sensTarget, setSensTarget] = useState('home');

  const [vols, setVols] = useState({ home: 1000, draw: 300, away: 150 });
  const [overrideOdds, setOverrideOdds] = useState({ home: '', draw: '', away: '' });

  const [teamsData, setTeamsData] = useState(null);
  const [eloData, setEloData] = useState(null);
  const [selectedHome, setSelectedHome] = useState('');
  const [selectedAway, setSelectedAway] = useState('');

  /**
   * Fetch pre-exported JSON datasets for teams (Poisson) and ELO ratings on mount.
   */
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
      .catch(() => console.log('Poisson data not found'));

    fetch(process.env.PUBLIC_URL + '/data/elo.json')
      .then(res => res.json())
      .then(data => setEloData(data))
      .catch(() => console.log('ELO data not found'));
  }, []);

  /**
   * Automatically update model parameters (lambdas or ELO ratings) when team selection or pricing method changes.
   */
  useEffect(() => {
    if (method === 'poisson') {
      if (teamsData && selectedHome && selectedAway) {
        const homeAtk = teamsData[selectedHome]?.attack_xg || 1.35;
        const awayDef = teamsData[selectedAway]?.defense_xg || 1.35;
        const awayAtk = teamsData[selectedAway]?.attack_xg || 1.35;
        const homeDef = teamsData[selectedHome]?.defense_xg || 1.35;

        // Maher's multiplicative model: (Attack * Defense) / League_Avg
        const lambdaHome = (homeAtk * awayDef) / LEAGUE_AVG_XG;
        const lambdaAway = (awayAtk * homeDef) / LEAGUE_AVG_XG;

        setHomeValue(lambdaHome.toFixed(2));
        setAwayValue(lambdaAway.toFixed(2));
      } else {
        setHomeValue(1.5);
        setAwayValue(1.1);
      }
    } else if (method === 'elo') {
      if (eloData && selectedHome && selectedAway) {
        if (eloData[selectedHome] === undefined || eloData[selectedAway] === undefined) {
          console.warn(`Missing ELO rating for ${selectedHome} or ${selectedAway}, falling back to 1500`);
        }
        setHomeValue(eloData[selectedHome] ?? 1500);
        setAwayValue(eloData[selectedAway] ?? 1500);
      } else {
        setHomeValue(1550);
        setAwayValue(1500);
      }
    }
  }, [selectedHome, selectedAway, method, teamsData, eloData]);

  /**
   * Core probability engine: calculates fair 1X2 probabilities via Poisson-Dixon-Coles integration or ELO formula.
   */
  useEffect(() => {
    if (method === 'poisson') {
      const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
      const poissonProb = (k, lambda) => (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);

      const lh = Math.max(0.05, parseFloat(homeValue) || 0);
      const la = Math.max(0.05, parseFloat(awayValue) || 0);

      // Dixon-Coles adjustment function for low-scoring match outcomes
      const tau = (i, j) => {
        if (i === 0 && j === 0) return 1 - lh * la * DC_RHO;
        if (i === 0 && j === 1) return 1 + lh * DC_RHO;
        if (i === 1 && j === 0) return 1 + la * DC_RHO;
        if (i === 1 && j === 1) return 1 - DC_RHO;
        return 1.0;
      };

      let hProb = 0, dProb = 0, aProb = 0;
      const matrix = [];

      // Integrate goals up to 10 to avoid tail probability loss
      for (let i = 0; i <= 10; i++) {
        const row = [];
        for (let j = 0; j <= 10; j++) {
          const rawProb = poissonProb(i, lh) * poissonProb(j, la) * tau(i, j);
          const prob = Math.max(0, rawProb);

          if (i <= 4 && j <= 4) row.push(prob);
          if (i > j) hProb += prob;
          else if (i === j) dProb += prob;
          else aProb += prob;
        }
        if (i <= 4) matrix.push(row);
      }

      const total = hProb + dProb + aProb;
      if (total > 0) {
        setProbs({ home: hProb / total, draw: dProb / total, away: aProb / total });
      }
      setHeatmap(matrix);

    } else {
      const calcEloOdds = (h, a) => {
        const eloDiff = (h + HOME_ADV) - a;
        const rawHome = 1 / (1 + Math.pow(10, -(eloDiff - ELO_DRAW_MARGIN) / 400));
        const rawAway = 1 / (1 + Math.pow(10, (eloDiff + ELO_DRAW_MARGIN) / 400));
        const rawDraw = Math.max(0, 1 - rawHome - rawAway);

        const total = rawHome + rawDraw + rawAway;
        return { home: rawHome / total, draw: rawDraw / total, away: rawAway / total };
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

  /**
   * Converts fair probability into bookmaker odds including margin and Favourite-Longshot Bias.
   */
  const toOddsWithMargin = (prob) => {
    if (prob <= 0) return '0.00';
    let m = (parseFloat(margin) || 0) / 100;
    if (prob >= 0.55) m = m * 0.5;
    else if (prob <= 0.25) m = m * 1.5;
    return (1 / (prob * (1 + m))).toFixed(2);
  };

  const toPercent = (prob) => (prob * 100).toFixed(1);

  useEffect(() => {
    if (probs.home > 0) {
      setOverrideOdds({
        home: toOddsWithMargin(probs.home),
        draw: toOddsWithMargin(probs.draw),
        away: toOddsWithMargin(probs.away)
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probs, margin]);

  // Hybrid pricing engine: Blends 80% quant model probability with 20% market volume fraction
  const totalVolume = Number(vols.home) + Number(vols.draw) + Number(vols.away);
  const targetOverround = 1 + (parseFloat(margin) || 0) / 100;

  const baseP = {
    home: probs.home > 0 ? probs.home : 0.33,
    draw: probs.draw > 0 ? probs.draw : 0.33,
    away: probs.away > 0 ? probs.away : 0.33
  };

  const mFrac = {
    home: totalVolume > 0 ? Number(vols.home) / totalVolume : baseP.home,
    draw: totalVolume > 0 ? Number(vols.draw) / totalVolume : baseP.draw,
    away: totalVolume > 0 ? Number(vols.away) / totalVolume : baseP.away
  };

  const MARKET_WEIGHT = 0.2;
  const blended = {
    home: baseP.home * (1 - MARKET_WEIGHT) + mFrac.home * MARKET_WEIGHT,
    draw: baseP.draw * (1 - MARKET_WEIGHT) + mFrac.draw * MARKET_WEIGHT,
    away: baseP.away * (1 - MARKET_WEIGHT) + mFrac.away * MARKET_WEIGHT
  };

  const suggestedOdds = {
    home: (1 / (blended.home * targetOverround)).toFixed(2),
    draw: (1 / (blended.draw * targetOverround)).toFixed(2),
    away: (1 / (blended.away * targetOverround)).toFixed(2)
  };

  /**
   * Handles manual odds overrides with Elastic Margin protection to prevent extreme odds collapse.
   */
  const handleManualOddsChange = (changedOutcome, value) => {
    const val = parseFloat(value);

    if (isNaN(val) || val <= 1) {
      setOverrideOdds({ ...overrideOdds, [changedOutcome]: value });
      return;
    }

    const newProb = 1 / val;
    let remainingOverround = targetOverround - newProb;

    let baseRemaining = 0;
    if (changedOutcome === 'home') baseRemaining = (blended.draw + blended.away) * targetOverround;
    if (changedOutcome === 'draw') baseRemaining = (blended.home + blended.away) * targetOverround;
    if (changedOutcome === 'away') baseRemaining = (blended.home + blended.draw) * targetOverround;

    // Elastic Margin protection: ensures remaining outcomes retain at least 60% of baseline probability weight
    const minRequiredProb = baseRemaining * 0.60;
    if (remainingOverround < minRequiredProb) {
      remainingOverround = minRequiredProb;
    }

    let newOdds = { ...overrideOdds, [changedOutcome]: value };

    if (changedOutcome === 'home') {
      const weightDraw = blended.draw / (blended.draw + blended.away);
      const weightAway = blended.away / (blended.draw + blended.away);
      newOdds.draw = (1 / (remainingOverround * weightDraw)).toFixed(2);
      newOdds.away = (1 / (remainingOverround * weightAway)).toFixed(2);
    } else if (changedOutcome === 'draw') {
      const weightHome = blended.home / (blended.home + blended.away);
      const weightAway = blended.away / (blended.home + blended.away);
      newOdds.home = (1 / (remainingOverround * weightHome)).toFixed(2);
      newOdds.away = (1 / (remainingOverround * weightAway)).toFixed(2);
    } else if (changedOutcome === 'away') {
      const weightHome = blended.home / (blended.home + blended.draw);
      const weightDraw = blended.draw / (blended.home + blended.draw);
      newOdds.home = (1 / (remainingOverround * weightHome)).toFixed(2);
      newOdds.draw = (1 / (remainingOverround * weightDraw)).toFixed(2);
    }

    setOverrideOdds(newOdds);
  };

  const activeOdds = {
    home: overrideOdds.home !== '' ? parseFloat(overrideOdds.home) || 0 : parseFloat(toOddsWithMargin(probs.home)) || 0,
    draw: overrideOdds.draw !== '' ? parseFloat(overrideOdds.draw) || 0 : parseFloat(toOddsWithMargin(probs.draw)) || 0,
    away: overrideOdds.away !== '' ? parseFloat(overrideOdds.away) || 0 : parseFloat(toOddsWithMargin(probs.away)) || 0
  };

  // Calculates actual bookmaker margin including bias and overrides
  const realMargin = (activeOdds.home > 0 && activeOdds.draw > 0 && activeOdds.away > 0)
    ? ((1 / activeOdds.home + 1 / activeOdds.draw + 1 / activeOdds.away - 1) * 100).toFixed(2)
    : '0.00';

  const pnl = {
    home: totalVolume - (Number(vols.home) * activeOdds.home),
    draw: totalVolume - (Number(vols.draw) * activeOdds.draw),
    away: totalVolume - (Number(vols.away) * activeOdds.away),
  };

  const hasData = (method === 'poisson' && teamsData) || (method === 'elo' && eloData);
  const dataKeys = hasData ? (method === 'poisson' ? Object.keys(teamsData).sort() : Object.keys(eloData).sort()) : [];

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {hasData ? <Database className="text-blue-400" size={24} /> : <Calculator className="text-blue-400" size={24} />}
          <h2 className="text-xl font-bold text-white uppercase tracking-wide">
            {method === 'poisson' ? 'Poisson (Dixon-Coles) Predictor' : 'ELO Market Pricing'}
          </h2>
        </div>
        <span className="text-xs text-gray-400 bg-gray-900 px-3 py-1 rounded border border-gray-700 font-mono">
          {method === 'poisson' ? `ρ = ${DC_RHO}` : `HFA = +${HOME_ADV}`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gray-900 p-4 rounded-md border border-gray-700">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Home Team</label>
          {hasData ? (
            <select value={selectedHome} onChange={(e) => setSelectedHome(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2">
              {dataKeys.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
          ) : (
            <input type="number" step="0.1" value={homeValue} onChange={(e) => setHomeValue(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2" />
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Away Team</label>
          {hasData ? (
            <select value={selectedAway} onChange={(e) => setSelectedAway(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2">
              {dataKeys.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
          ) : (
            <input type="number" step="0.1" value={awayValue} onChange={(e) => setAwayValue(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2" />
          )}
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-400">Target Margin (%)</label>
            <span className="text-xs font-mono text-blue-400">Actual: {realMargin}%</span>
          </div>
          <input type="number" step="0.1" value={margin} onChange={(e) => setMargin(e.target.value)} className="w-full bg-gray-800 text-blue-300 font-bold border border-gray-600 rounded px-3 py-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
              Book Overround: {(100 + parseFloat(realMargin)).toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-center">
          {/* HOME */}
          <div className="flex flex-col gap-2 bg-gray-800 p-3 rounded border border-gray-700">
            <label className="text-gray-400 text-xs uppercase font-bold">Money on HOME</label>
            <input type="number" value={vols.home} onChange={(e) => setVols({ ...vols, home: e.target.value })} className="w-full bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-center" />

            <div className="flex justify-between items-center mt-2 border-b border-gray-700 pb-1">
              <span className="text-gray-500 text-xs uppercase">Recommended:</span>
              <span className="text-blue-400 font-mono font-bold">{suggestedOdds.home}</span>
            </div>

            <label className="text-gray-400 text-xs uppercase mt-1">Manual Odds</label>
            <input
              type="number"
              step="0.01"
              value={overrideOdds.home}
              onChange={(e) => handleManualOddsChange('home', e.target.value)}
              className="w-full bg-gray-900 text-blue-300 font-bold border border-gray-600 rounded px-2 py-1 text-center"
            />

            <div className={`mt-2 p-2 rounded font-mono font-bold border ${pnl.home < 0 ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'}`}>
              P&L: {pnl.home > 0 ? '+' : ''}${pnl.home.toFixed(2)}
            </div>
          </div>

          {/* DRAW */}
          <div className="flex flex-col gap-2 bg-gray-800 p-3 rounded border border-gray-700">
            <label className="text-gray-400 text-xs uppercase font-bold">Money on DRAW</label>
            <input type="number" value={vols.draw} onChange={(e) => setVols({ ...vols, draw: e.target.value })} className="w-full bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-center" />

            <div className="flex justify-between items-center mt-2 border-b border-gray-700 pb-1">
              <span className="text-gray-500 text-xs uppercase">Recommended:</span>
              <span className="text-blue-400 font-mono font-bold">{suggestedOdds.draw}</span>
            </div>

            <label className="text-gray-400 text-xs uppercase mt-1">Manual Odds</label>
            <input
              type="number"
              step="0.01"
              value={overrideOdds.draw}
              onChange={(e) => handleManualOddsChange('draw', e.target.value)}
              className="w-full bg-gray-900 text-blue-300 font-bold border border-gray-600 rounded px-2 py-1 text-center"
            />

            <div className={`mt-2 p-2 rounded font-mono font-bold border ${pnl.draw < 0 ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'}`}>
              P&L: {pnl.draw > 0 ? '+' : ''}${pnl.draw.toFixed(2)}
            </div>
          </div>

          {/* AWAY */}
          <div className="flex flex-col gap-2 bg-gray-800 p-3 rounded border border-gray-700">
            <label className="text-gray-400 text-xs uppercase font-bold">Money on AWAY</label>
            <input type="number" value={vols.away} onChange={(e) => setVols({ ...vols, away: e.target.value })} className="w-full bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-center" />

            <div className="flex justify-between items-center mt-2 border-b border-gray-700 pb-1">
              <span className="text-gray-500 text-xs uppercase">Recommended:</span>
              <span className="text-blue-400 font-mono font-bold">{suggestedOdds.away}</span>
            </div>

            <label className="text-gray-400 text-xs uppercase mt-1">Manual Odds</label>
            <input
              type="number"
              step="0.01"
              value={overrideOdds.away}
              onChange={(e) => handleManualOddsChange('away', e.target.value)}
              className="w-full bg-gray-900 text-blue-300 font-bold border border-gray-600 rounded px-2 py-1 text-center"
            />

            <div className={`mt-2 p-2 rounded font-mono font-bold border ${pnl.away < 0 ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'}`}>
              P&L: {pnl.away > 0 ? '+' : ''}${pnl.away.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {method === 'poisson' && (
        <div className="mt-6 border-t border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={18} />
              <h3 className="text-md font-semibold text-gray-200">Correct Score Matrix (Display 0-4, Integrated 0-10)</h3>
            </div>
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
                  <th className="p-2 border border-gray-700 bg-gray-900 text-gray-400">Shift</th>
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
                    <td className="p-2 border border-gray-700 font-mono text-gray-300">{toOddsWithMargin(row.odds.odds?.draw ?? row.odds.draw)}</td>
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