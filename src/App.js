import React, { useState } from 'react';
import MethodSelector from './MethodSelector';
import OddsCalculator from './OddsCalculator';
import Formulas from './Formulas';
import useModelData from './useModelData';

function App() {
  const [activeTab, setActiveTab] = useState('poisson');
  // Data and team selection live here so they survive switching between tabs
  const data = useModelData();
  const [selectedHome, setSelectedHome] = useState('');
  const [selectedAway, setSelectedAway] = useState('');

  const calculatorProps = { data, selectedHome, selectedAway, onSelectHome: setSelectedHome, onSelectAway: setSelectedAway };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-blue-400">ODDS ANALYSER</h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Quantitative Pricing Model</p>
          </div>
          <MethodSelector activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 mt-4">
        {data.errors.length > 0 && (
          <div role="alert" className="mb-4 p-3 rounded border border-yellow-700 bg-yellow-900/30 text-yellow-300 text-sm">
            Some model data could not be loaded ({data.errors.join('; ')}). Manual input mode is used instead.
          </div>
        )}
        {activeTab === 'poisson' && <OddsCalculator method="poisson" {...calculatorProps} />}
        {activeTab === 'elo' && <OddsCalculator method="elo" {...calculatorProps} />}
        {activeTab === 'formulas' && <Formulas />}
      </main>
    </div>
  );
}

export default App;
