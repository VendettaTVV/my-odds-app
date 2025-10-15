import React from 'react';
import OddsCalculator from './OddsCalculator';
import './styles.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Odds Analyser: ELO & Poisson</h1>
      </header>
      <main>
        <OddsCalculator />
      </main>
    </div>
  );
}

export default App;