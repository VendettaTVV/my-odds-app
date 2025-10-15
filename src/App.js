import React from 'react';
import OddsCalculator from './OddsCalculator';
import './styles.css';
import logo from './wp8054782.jpg';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div className="header-image-container">
        <img src={logo} className="App-logo" alt="logo" />
        <h1 className="header-text-1">Odds Analyser </h1>
        <h1 className="header-text-2">ELO & Poisson Methods</h1>
        </div>
      </header>
      <main>
        <OddsCalculator />
      </main>
    </div>
  );
}

export default App;