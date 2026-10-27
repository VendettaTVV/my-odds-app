import React, { useState } from 'react';
import MethoSelector from './MethoSelector';
import OddsCalculator from './OddsCalculator';
import Formulas from './Formulas';

function App() {
  const [activeTab, setActiveTab] = useState('poisson');

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-blue-400">ODDS ANALYSER</h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Quantitative Pricing Model</p>
          </div>
          <MethoSelector activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto p-6 mt-4">
        {activeTab === 'poisson' && <OddsCalculator method="poisson" />}
        {activeTab === 'elo' && <OddsCalculator method="elo" />}
        {activeTab === 'formulas' && <Formulas />}
      </main>
    </div>
  );
}

export default App;