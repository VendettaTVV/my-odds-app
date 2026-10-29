import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Percent, Database } from 'lucide-react';
import { OUTCOMES, OUTCOME_META, mapOutcomes } from './outcomes';
import {
  DEFAULT_POISSON_PARAMS, DEFAULT_ELO_PARAMS,
  poissonLambdas, poissonOutcome, eloProbs,
  oddsWithMargin, bookMarginPct, blendWithMarket, suggestedOdds, rebalanceOdds, profitAndLoss
} from './pricing';
import RiskManager from './RiskManager';
import ScoreHeatmap from './ScoreHeatmap';
import SensitivityTable from './SensitivityTable';

const MANUAL_DEFAULTS = {
  poisson: { home: '1.5', away: '1.1', step: '0.1', name: 'λ (expected goals)' },
  elo: { home: '1550', away: '1500', step: '10', name: 'ELO rating' }
};

const toPercent = (prob) => (prob * 100).toFixed(1);

/**
 * OddsCalculator Component
 * Quantitative trading terminal for match pricing and risk management.
 * All maths lives in pricing.js; this component only wires state to it.
 */
function OddsCalculator({ method, data, selectedHome, selectedAway, onSelectHome, onSelectAway }) {
  const manual = MANUAL_DEFAULTS[method];
  const [manualHome, setManualHome] = useState(manual.home);
  const [manualAway, setManualAway] = useState(manual.away);
  const [margin, setMargin] = useState('5');
  const [volumeInputs, setVolumeInputs] = useState({ home: '1000', draw: '300', away: '150' });
  const [oddsInputs, setOddsInputs] = useState({ home: '', draw: '', away: '' });

  const model = method === 'poisson' ? data.poisson : data.elo;
  const teamList = useMemo(
    () => (model ? Object.keys(method === 'poisson' ? model.teams : model.ratings).sort() : []),
    [model, method]
  );
  const hasData = teamList.length >= 2;
  const home = teamList.includes(selectedHome) ? selectedHome : teamList[0];
  const away = teamList.includes(selectedAway) ? selectedAway : teamList[1];

  const marginPct = parseFloat(margin) || 0;

  // Model inputs (lambdas or ratings) and fair 1X2 probabilities, derived from the selection
  const pricing = useMemo(() => {
    if (method === 'poisson') {
      const params = model?.params ?? DEFAULT_POISSON_PARAMS;
      const lambdas = hasData
        ? poissonLambdas(model.teams[home], model.teams[away], params)
        : { home: parseFloat(manualHome) || 0, away: parseFloat(manualAway) || 0 };
      return { params, inputs: lambdas, ...poissonOutcome(lambdas.home, lambdas.away, params) };
    }
    const params = model?.params ?? DEFAULT_ELO_PARAMS;
    const ratings = hasData
      ? { home: model.ratings[home], away: model.ratings[away] }
      : { home: parseFloat(manualHome) || 1500, away: parseFloat(manualAway) || 1500 };
    return { params, inputs: ratings, probs: eloProbs(ratings.home, ratings.away, params) };
  }, [method, model, hasData, home, away, manualHome, manualAway]);

  const { probs } = pricing;
  const modelOdds = useMemo(() => mapOutcomes((o) => oddsWithMargin(probs[o], marginPct)), [probs, marginPct]);

  // A new model price resets the trader's manual odds to the model odds
  useEffect(() => {
    setOddsInputs(mapOutcomes((o) => modelOdds[o].toFixed(2)));
  }, [modelOdds]);

  const volumes = mapOutcomes((o) => Math.max(0, Number(volumeInputs[o]) || 0));
  const totalVolume = OUTCOMES.reduce((sum, o) => sum + volumes[o], 0);
  const blended = blendWithMarket(probs, volumes);
  const suggested = suggestedOdds(blended, marginPct);

  // Valid manual odds (> 1) override the model price, anything else falls back to it
  const activeOdds = mapOutcomes((o) => {
    const value = parseFloat(oddsInputs[o]);
    return value > 1 ? value : modelOdds[o];
  });
  const realMargin = bookMarginPct(activeOdds);
  const pnl = profitAndLoss(volumes, activeOdds);

  const handleManualOddsChange = (outcome, text) => {
    const value = parseFloat(text);
    // Incomplete input ("", "1.") is kept as typed without re-pricing
    if (!(value > 1)) {
      setOddsInputs((prev) => ({ ...prev, [outcome]: text }));
      return;
    }
    const rebalanced = rebalanceOdds(outcome, value, blended, marginPct);
    setOddsInputs(mapOutcomes((o) => (o === outcome ? text : rebalanced[o].toFixed(2))));
  };

  const formatInput = (value) => (method === 'poisson' ? `λ = ${value.toFixed(2)}` : `ELO ${Math.round(value)}`);

  const renderTeamInput = (side, label, team, onSelect, manualValue, setManualValue) => (
    <div>
      <label htmlFor={`team-${side}`} className="block text-sm text-gray-400 mb-2">
        {hasData ? label : `${label} ${manual.name}`}
      </label>
      {hasData ? (
        <>
          <select id={`team-${side}`} value={team} onChange={(e) => onSelect(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2">
            {teamList.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="block mt-1 text-xs font-mono text-gray-500">{formatInput(pricing.inputs[side])}</span>
        </>
      ) : (
        <input id={`team-${side}`} type="number" step={manual.step} value={manualValue} onChange={(e) => setManualValue(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2" />
      )}
    </div>
  );

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
          {method === 'poisson'
            ? `ρ = ${pricing.params.dcRho}`
            : `HFA = +${pricing.params.homeAdv} · Draw = ±${pricing.params.drawMargin}`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gray-900 p-4 rounded-md border border-gray-700">
        {renderTeamInput('home', 'Home Team', home, onSelectHome, manualHome, setManualHome)}
        {renderTeamInput('away', 'Away Team', away, onSelectAway, manualAway, setManualAway)}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="margin" className="text-sm text-gray-400">Target Margin (%)</label>
            <span className="text-xs font-mono text-blue-400">Actual: {realMargin.toFixed(2)}%</span>
          </div>
          <input id="margin" type="number" step="0.1" value={margin} onChange={(e) => setMargin(e.target.value)} className="w-full bg-gray-800 text-blue-300 font-bold border border-gray-600 rounded px-3 py-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {OUTCOMES.map((o) => (
          <div key={o} className="bg-gray-900 border border-gray-700 p-4 rounded-md text-center flex flex-col items-center justify-center">
            <span className="text-gray-400 text-xs tracking-widest mb-1">{OUTCOME_META[o].label}</span>
            <span className={`text-3xl font-bold ${OUTCOME_META[o].color} mb-1`}>{modelOdds[o].toFixed(2)}</span>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Percent size={12} /> {toPercent(probs[o])}%
            </div>
          </div>
        ))}
      </div>

      <RiskManager
        volumeInputs={volumeInputs}
        onVolumeChange={(o, value) => setVolumeInputs((prev) => ({ ...prev, [o]: value }))}
        suggested={suggested}
        oddsInputs={oddsInputs}
        onOddsChange={handleManualOddsChange}
        pnl={pnl}
        totalVolume={totalVolume}
        realMargin={realMargin}
      />

      {method === 'poisson' && <ScoreHeatmap matrix={pricing.matrix} />}
      {method === 'elo' && (
        <SensitivityTable
          homeElo={pricing.inputs.home}
          awayElo={pricing.inputs.away}
          params={pricing.params}
          marginPct={marginPct}
        />
      )}
    </div>
  );
}

export default OddsCalculator;
