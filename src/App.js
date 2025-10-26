import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import OddsCalculator from './OddsCalculator';
import Formulas from './Formulas';
import './styles.css';
import logo from './wp8054782.jpg';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <nav className='main-nav'>
            <Link to="/oddsCalculator" className='nav-link'>OddsCalculator</Link>
            <Link to="/formulas" className='nav-link'>Analysis Formulas</Link>
          </nav>
          <div className="header-image-container">
          <img src={logo} className="App-logo" alt="logo" />
            <div className='header-text-container'>
              <h1 className='header-text '>Odds Analyser </h1>
              <h1 className='header-text'>ELO & Poisson Methods</h1>
            </div>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/oddsCalculator" element={<OddsCalculator />}/>
            <Route path="/formulas" element={<Formulas />}/>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;