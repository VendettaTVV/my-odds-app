import React from 'react';
import { BookOpen, Sigma, Hash, Percent, ShieldAlert, Database } from 'lucide-react';

function Formulas() {
  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-700 pb-4">
        <BookOpen className="text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-white uppercase tracking-wide">
          Analysis Formulas & Methodology
        </h2>
      </div>

      <p className="text-sm text-gray-400 mb-8 leading-relaxed">
        This section outlines the mathematical models used by professional traders to set fair odds, manage risk, and identify value betting opportunities. However, quantitative models are only as effective as the data feeding them. Accurate pricing requires a comprehensive historical database and must account for dynamic external factors (e.g., injuries, weather conditions, team motivation, schedule fatigue, and referee tendencies), while always acknowledging the inherent element of randomness and variance present in all live sports.
      </p>

      <div className="space-y-8 text-gray-300">

        {/* DATA SOURCES SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Database className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-gray-100">Data Sources & Inputs</h3>
          </div>
          <div className="bg-gray-900 p-4 rounded-md border border-gray-700 text-sm">
            <ul className="space-y-2">
              <li><strong className="text-white">Match results:</strong> Four Premier League seasons from <strong>football-data.co.uk</strong>, stored in a local SQLite database by the Python pipeline.</li>
              <li><strong className="text-white">Team strengths (Poisson):</strong> Time-decay weighted goals scored and conceded over each team's last 38 matches (actual goals, not shot-based xG). League home/away scoring rates are exported alongside them.</li>
              <li><strong className="text-white">ELO Ratings:</strong> Replayed match by match from the same history. K-factor, home advantage and the draw threshold are calibrated by a walk-forward grid search minimising the 1X2 Brier score on unseen seasons.</li>
            </ul>
          </div>
        </section>

        {/* 1. FUNDAMENTALS */}
        <section className="pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-gray-100">1. Fundamental Concepts</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
              <h4 className="text-md font-medium text-blue-300 mb-2">1.1. Odds and Probability</h4>
              <p className="text-xs text-gray-400 mb-3">The core principle: odds are the inverse of probability. Used to convert assessed probability into a fair price.</p>
              <div className="font-mono text-sm text-green-400 text-center bg-gray-800 p-2 rounded">
                Decimal Odds (K) = 1 / True Probability (P)
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
              <h4 className="text-md font-medium text-blue-300 mb-2">1.2. Bookmaker Margin (Juice)</h4>
              <p className="text-xs text-gray-400 mb-3">The bookmaker's guaranteed profit; the sum of all implied probabilities exceeds 100%.</p>
              <div className="font-mono text-sm text-yellow-400 text-center bg-gray-800 p-2 rounded mb-2">
                K_margin = 1 / (P_true &times; (1 + Margin))
              </div>
              <p className="text-xs text-gray-500"><strong>Margin</strong> is expressed as a decimal (e.g., 5% is 0.05) to reduce payout and guarantee profit.</p>
            </div>
          </div>
        </section>

        {/* 2. ELO METHOD */}
        <section className="pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-gray-100">2. ELO Method Adjustments</h3>
          </div>
          
          <div className="bg-gray-900 p-4 rounded-md border border-gray-700 mb-4">
            <h4 className="text-md font-medium text-blue-300 mb-2">2.1. ELO Win Probability</h4>
            <p className="text-xs text-gray-400 mb-3">Calculates the probability of Team A winning based on the difference in ELO ratings (R).</p>
            <div className="font-mono text-sm text-center bg-gray-800 p-3 rounded mb-2 text-gray-200">
              P_A = 1 / (1 + 10<sup>(R_B - R_A)/400</sup>)
            </div>
            <p className="text-xs text-gray-500"><strong>400</strong> is a standard constant determining how rating difference translates to probability difference.</p>
          </div>

          <div className="bg-gray-900 p-4 rounded-md border border-gray-700 mb-4">
            <h4 className="text-md font-medium text-blue-300 mb-2">2.2. 1X2 Probabilities with a Draw Threshold</h4>
            <p className="text-xs text-gray-400 mb-3">The win/loss curve is split by a symmetric threshold D; the gap between the two curves is the draw probability.</p>
            <div className="font-mono text-sm text-center bg-gray-800 p-3 rounded mb-2 text-gray-200 space-y-1">
              <div>&Delta; = R_home + HFA - R_away</div>
              <div>P_1 = 1 / (1 + 10<sup>-(&Delta; - D)/400</sup>)</div>
              <div>P_2 = 1 / (1 + 10<sup>(&Delta; + D)/400</sup>)</div>
              <div>P_X = 1 - P_1 - P_2</div>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-md border border-gray-700 text-sm">
            <h4 className="text-md font-medium text-blue-300 mb-2">2.3. Key ELO Adjustment Factors</h4>
            <ul className="space-y-2 list-disc pl-5 text-gray-400">
              <li><strong className="text-white">Home Advantage:</strong> ELO points added to the home team's rating, calibrated from historical results.</li>
              <li><strong className="text-white">Rating update:</strong> R_new = R_old + K &times; (Actual - Expected), where Actual is 1 / 0.5 / 0 and the update is zero-sum between the two teams.</li>
              <li><strong className="text-white">Injuries/Suspensions:</strong> Subtracts 20-50 ELO points from the affected team's rating (Risk assessment).</li>
              <li><strong className="text-white">xG/Form Adjustment:</strong> Adding or subtracting points based on recent Expected Goals performance.</li>
            </ul>
          </div>
        </section>

        {/* 3. POISSON METHOD */}
        <section className="pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Sigma className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-gray-100">3. Poisson Method & Expected Goals (xG)</h3>
          </div>

          <div className="bg-gray-900 p-4 rounded-md border border-gray-700 mb-4">
            <h4 className="text-md font-medium text-blue-300 mb-2">3.1. Expected Goals (&lambda;) Calculation</h4>
            <p className="text-xs text-gray-400 mb-3">Maher's multiplicative model. Strengths are relative to the league average goals per team (Avg), and home advantage comes from the league home/away scoring rates.</p>
            <div className="font-mono text-sm text-center bg-gray-800 p-3 rounded mb-2 text-gray-200 space-y-1">
              <div>&lambda;_home = (Attack_home / Avg) &times; (Defense_away / Avg) &times; Avg_home_goals</div>
              <div>&lambda;_away = (Attack_away / Avg) &times; (Defense_home / Avg) &times; Avg_away_goals</div>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-md border border-gray-700 mb-4">
            <h4 className="text-md font-medium text-blue-300 mb-2">3.2. Dixon-Coles Low-Score Correction</h4>
            <p className="text-xs text-gray-400 mb-3">Independent Poisson under-predicts 0:0 and 1:1. The score probability is multiplied by &tau;; a negative &rho; moves probability towards these draws.</p>
            <div className="font-mono text-sm text-center bg-gray-800 p-3 rounded mb-2 text-gray-200 space-y-1">
              <div>&tau;(0,0) = 1 - &lambda;&mu;&rho; &nbsp; &tau;(0,1) = 1 + &lambda;&rho;</div>
              <div>&tau;(1,0) = 1 + &mu;&rho; &nbsp; &tau;(1,1) = 1 - &rho;</div>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
            <h4 className="text-md font-medium text-blue-300 mb-2">3.3. Poisson Probability (Score k)</h4>
            <p className="text-xs text-gray-400 mb-3">Probability of a team scoring exactly k goals in a match.</p>
            <div className="font-mono text-sm text-center bg-gray-800 p-3 rounded mb-2 text-gray-200">
              P(k) = (&lambda;<sup>k</sup> &times; e<sup>-&lambda;</sup>) / k!
            </div>
            <p className="text-xs text-gray-500"><strong>k</strong> = goals (0, 1, 2...), <strong>&lambda;</strong> = Expected Goals, <strong>e</strong> = Euler's number (~2.718). The factorial (k!) normalizes the distribution.</p>
          </div>
        </section>

        {/* 4. VALUE & RISK */}
        <section className="pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-gray-100">4. Value and Risk Management</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
              <h4 className="text-md font-medium text-blue-300 mb-2">4.1. Expected Value (EV)</h4>
              <p className="text-xs text-gray-400 mb-3">Determines the long-term profitability of a bet. Finding a positive EV is the primary goal.</p>
              <div className="font-mono text-sm text-center bg-gray-800 p-2 rounded mb-2 text-green-400">
                EV = (P_your &times; K_bookmaker) - 1
              </div>
              <p className="text-xs text-gray-500">EV &gt; 0 signifies a <strong>Value Bet</strong> (you have an edge over the market).</p>
            </div>

            <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
              <h4 className="text-md font-medium text-blue-300 mb-2">4.2. Kelly Criterion</h4>
              <p className="text-xs text-gray-400 mb-3">Optimal bet size (K) as a fraction of total bankroll to maximize growth.</p>
              <div className="font-mono text-sm text-center bg-gray-800 p-2 rounded mb-2 text-gray-200">
                K = (B &times; P - Q) / B
              </div>
              <p className="text-xs text-gray-500 mb-2"><strong>B</strong> = Net Payout (Odds - 1), <strong>P</strong> = Your Prob, <strong>Q</strong> = Prob of Losing (1 - P).</p>
              <p className="text-xs text-red-400 font-semibold border-t border-gray-700 pt-2">Risk Mgt: Always use fractional Kelly (e.g. half-Kelly) to minimize variance.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default Formulas;