
import './Formulas.css';

const Formulas = () => {
    return (
        <div className="formulas-container">
            <h2>Analysis Formulas</h2>
            <p className="intro-text">
                This section outlines the mathematical models used by professional traders to set fair odds, manage risk, and identify value betting opportunities.
            </p>
            
            {/* ---------------------------------------------------- */}
            <h3>1. Fundamental Concepts</h3>
            
            <div className="formula-block">
                <h4>1.1. Odds and Probability</h4>
                <p>The core principle: odds are the inverse of probability. Used to convert your assessed probability into a fair price.</p>
                <div className="math-box">
                    Decimal Odds (K) = 1 / True Probability (P)
                </div>
                
                <h4>1.2. Bookmaker Margin (Juice)</h4>
                <p>The bookmaker's guaranteed profit; the sum of all implied probabilities exceeds 100%. This is the margin retention strategy.</p>
                <div className="math-box">
                    K<sub>margin</sub> = 1 / (P<sub>true</sub> &times; (1 + Margin))
                    <p className="explanation">
                        P<sub>true</sub> is the true probability. <strong>Margin</strong> is the bookmaker's percentage, expressed as a decimal (e.g., 5% is 0.05). This factor ensures the payout is reduced slightly to guarantee profit.
                    </p>
                </div>
            </div>

            {/* ---------------------------------------------------- */}
            <h3>2. ELO Method Adjustments</h3>
            
            <div className="formula-block">
                <h4>2.1. ELO Win Probability</h4>
                <p>Calculates the probability of Team A winning based on the difference in ELO ratings (R). Used primarily for head-to-head competition assessment.</p>
                <div className="math-box">
                    P<sub>A</sub> = 1 / (1 + 10<sup>(R<sub>B</sub> - R<sub>A</sub>)/400</sup>)
                    <p className="explanation">
                        R<sub>A</sub> and R<sub>B</sub> are the ELO ratings for Team A and Team B. The value '400' is a standard constant determining how rating difference translates to probability difference.
                    </p>
                </div>
                
                <h4>2.2. Key ELO Adjustment Factors</h4>
                <p>Adjusting the base ELO rating is crucial for accuracy and adapting the model to real-world factors:</p>
                <ul>
                    <li><strong>Home Advantage:</strong> Adds 20-50 ELO points to the home team's rating. (Empirical observation)</li>
                    <li><strong>Injuries/Suspensions:</strong> Subtracts 20-50 ELO points from the affected team's rating. (Risk assessment)</li>
                    <li><strong>xG/Form Adjustment:</strong> Adding or subtracting points based on recent Expected Goals performance.</li>
                </ul>
            </div>
            
            {/* ---------------------------------------------------- */}
            <h3>3. Poisson Method & Expected Goals (xG)</h3>
            
            <div className="formula-block">
                <h4>3.1. Expected Goals (&lambda;) Calculation</h4>
                <p>Predicts the average number of goals Team A is expected to score against Team B, which becomes the input for the Poisson distribution.</p>
                <div className="math-box">
                    &lambda;<sub>A</sub> = Attack Strength<sub>A</sub> &times; Defense Strength<sub>B</sub> &times; League Average Goals
                    <p className="explanation">
                        <strong>Attack Strength</strong> measures how often Team A scores compared to the league average. <strong>Defense Strength</strong> measures how often Team B concedes compared to the league average. Their multiplication gives the expected outcome for this specific match-up.
                    </p>
                </div>

                <h4>3.2. Poisson Probability (Score k)</h4>
                <p>Used to find the probability of a team scoring exactly k goals in a match (e.g., 0, 1, 2 goals). Summing these probabilities gives the full range of final outcomes.</p>
                <div className="math-box">
                    P(k) = (&lambda;<sup>k</sup> &times; e<sup>-&lambda;</sup>) / k!
                    <p className="explanation">
                        <strong>k</strong> is the number of goals (0, 1, 2, etc.), <strong>&lambda;</strong> is the Expected Goals calculated above, and <strong>e</strong> is Euler's number (approx 2.718). The factorial (k!) is used for normalizing the distribution.
                    </p>
                </div>
            </div>

            {/* ---------------------------------------------------- */}
            <h3>4. Value and Risk Management</h3>
            
            <div className="formula-block">
                <h4>4.1. Expected Value (EV)</h4>
                <p>Determines the long-term profitability of a bet. Finding a positive EV is the primary goal of professional analysis.</p>
                <div className="math-box">
                    EV = (P<sub>your</sub> &times; K<sub>bookmaker</sub>) - 1
                    <p className="explanation">
                        <strong>P<sub>your</sub></strong> is your estimated probability (from ELO/Poisson), and <strong>K<sub>bookmaker</sub></strong> is the odds offered. EV > 0 signifies a **Value Bet** (you have an edge).
                    </p>
                </div>

                <h4>4.2. Kelly Criterion (Optimal Staking)</h4>
                <p>A formula to determine the optimal bet size ($K$) as a fraction of your total bankroll to maximize growth over time.</p>
                <div className="math-box">
                    K = (B &times; P - Q) / B
                    <p className="explanation">
                        <strong>B</strong> = Net Payout (Decimal Odds - 1), <strong>P</strong> = Your Probability, <strong>Q</strong> = Probability of Losing (1 - P).
                    </p>
                </div>
                <p className="warning">
                    <strong>Risk Management:</strong> Always use a fractional Kelly (e.g., half-Kelly) to account for estimation errors and minimize variance (risk of ruin).
                </p>
            </div>
            
        </div>
    );
};

export default Formulas;