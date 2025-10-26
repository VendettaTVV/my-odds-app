import React, { useState } from 'react';
import axios from 'axios';
import MethodSelector from './MethoSelector';

const OddsCalculator = () => {
    const [method, setMethod] = useState('poisson');
    const [results, setResults] = useState(null);
    const [setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [teamAName, setTeamAName] = useState('Team A');
    const [teamBName, setTeamBName] = useState('Team B');

    // ELO State
    const [eloA, setEloA] = useState();
    const [eloB, setEloB] = useState();
    const [eloHomeAdvantage, setEloHomeAdvantage] = useState(30);
    const [eloAdjustmentsA, setEloAdjustmentsA] = useState(0);
    const [eloAdjustmentsB, setEloAdjustmentsB] = useState(-20);

    // Poisson State
    const [avgGoalsLeague, setAvgGoalsLeague] = useState();
    const [goalsForHome, setGoalsForHome] = useState();
    const [goalsAgainstHome, setGoalsAgainstHome] = useState();
    const [goalsForAway, setGoalsForAway] = useState();
    const [goalsAgainstAway, setGoalsAgainstAway] = useState();

    // API Tokens and IDs
    const [apiToken] = useState('ff2371e19c03494cbc445bb12d1ea0bf');
    const [teamAId, setTeamAId] = useState('');
    const [teamBId, setTeamBId] = useState('');
    const [leagueId, setLeagueId] = useState('PL'); // Premier League

    // General State
    const [margin, setMargin] = useState(5);

    // --- Helper functions for odds conversion ---

    const toFractional = (decimal) => {
        if (decimal <= 1) return 'N/A';
        const val = decimal - 1;
        const tolerance = 0.01;
        for (let d = 1; d <= 100; d++) {
            const n = Math.round(val * d);
            if (Math.abs(val - n / d) < tolerance) {
                return `${n}/${d}`;
            }
        }
        return 'N/A';
    };

    const toAmerican = (decimal) => {
        if (decimal >= 2) {
            return `+${Math.round((decimal - 1) * 100)}`;
        } else {
            return `-${Math.round(100 / (decimal - 1))}`;
        }
    };
    
    // --- API data fetching logic ---

    const fetchTeamData = async () => {
        if (!teamAId || !teamBId) {
            setError('Please enter both team IDs.');
            return;
        }

        setLoading(true);
        setError('');

        const headers = { 'X-Auth-Token': apiToken };

        try {
            // Fetch League Data
            const leagueRes = await axios.get(
              `https://corsproxy.io/?https://api.football-data.org/v4/competitions/${leagueId}/matches?status=FINISHED`,
              { headers }
            );
            const allMatches = leagueRes.data.matches;
            const leagueAvgGoals = allMatches.reduce((sum, match) => sum + (match.score.fullTime.home ?? 0) + (match.score.fullTime.away ?? 0), 0) / allMatches.length;
            setAvgGoalsLeague(Number(leagueAvgGoals.toFixed(2)));

            // Fetch Team A Data
            const teamARes = await axios.get(
              `https://corsproxy.io/?https://api.football-data.org/v4/teams/${teamAId}/matches?status=FINISHED`,
              { headers }
            );
            const teamAMatches = teamARes.data.matches.filter(match => match.competition.code === leagueId);
            const homeMatchesA = teamAMatches.filter(match => match.homeTeam.id === Number(teamAId));
            

            const goalsForAHome = homeMatchesA.reduce((sum, match) => sum + (match.score.fullTime.home ?? 0), 0);
            const goalsAgainstAHome = homeMatchesA.reduce((sum, match) => sum + (match.score.fullTime.away ?? 0), 0);
            setGoalsForHome(Number((goalsForAHome / homeMatchesA.length).toFixed(2)) || 0);
            setGoalsAgainstHome(Number((goalsAgainstAHome / homeMatchesA.length).toFixed(2)) || 0);

            setTeamAName(homeMatchesA[0]?.homeTeam.name || 'Team A');

            // Fetch Team B Data
            const teamBRes = await axios.get(
              `https://corsproxy.io/?https://api.football-data.org/v4/teams/${teamBId}/matches?status=FINISHED`,
              { headers }
            );
            const teamBMatches = teamBRes.data.matches.filter(match => match.competition.code === leagueId);
            const awayMatchesB = teamBMatches.filter(match => match.awayTeam.id === Number(teamBId));

            const goalsForBAway = awayMatchesB.reduce((sum, match) => sum + (match.score.fullTime.away ?? 0), 0);
            const goalsAgainstBAway = awayMatchesB.reduce((sum, match) => sum + (match.score.fullTime.home ?? 0), 0);
            setGoalsForAway(Number((goalsForBAway / awayMatchesB.length).toFixed(2)) || 0);
            setGoalsAgainstAway(Number((goalsAgainstBAway / awayMatchesB.length).toFixed(2)) || 0);

            setTeamBName(awayMatchesB[0]?.awayTeam.name || 'Team B');

            setLoading(false);
            setError('');
        } catch (err) {
            setError('Failed to fetch data. Check your API token or team IDs.');
            setLoading(false);
        }
    };

    // --- ELO calculation logic ---

    const calculateEloOdds = () => {
        const finalEloA = Number(eloA) + Number(eloHomeAdvantage) + Number(eloAdjustmentsA);
        const finalEloB = Number(eloB) + Number(eloAdjustmentsB);
        const eloDifference = finalEloA - finalEloB;

        const probA_raw = 1 / (1 + Math.pow(10, -eloDifference / 400));
        const probB_raw = 1 - probA_raw;

        const drawProbRaw = 0.25;
        const totalRawProb = probA_raw + probB_raw + drawProbRaw;

        const probA_norm = probA_raw / totalRawProb;
        const probB_norm = probB_raw / totalRawProb;
        const probDraw_norm = drawProbRaw / totalRawProb;

        const marginFactor = 1 + Number(margin) / 100;
        const oddsA_dec = 1 / (probA_norm * marginFactor);
        const oddsB_dec = 1 / (probB_norm * marginFactor);
        const oddsDraw_dec = 1 / (probDraw_norm * marginFactor);

        setResults({
            probA: (probA_norm * 100).toFixed(2),
            oddsA_dec: oddsA_dec.toFixed(2),
            oddsA_frac: toFractional(oddsA_dec),
            oddsA_us: toAmerican(oddsA_dec),

            probB: (probB_norm * 100).toFixed(2),
            oddsB_dec: oddsB_dec.toFixed(2),
            oddsB_frac: toFractional(oddsB_dec),
            oddsB_us: toAmerican(oddsB_dec),

            probDraw: (probDraw_norm * 100).toFixed(2),
            oddsDraw_dec: oddsDraw_dec.toFixed(2),
            oddsDraw_frac: toFractional(oddsDraw_dec),
            oddsDraw_us: toAmerican(oddsDraw_dec),
        });
    };

    // --- Poisson calculation logic ---

    const calculatePoissonOdds = () => {
        const attackStrengthA = goalsForHome / avgGoalsLeague;
        const defenseStrengthA = goalsAgainstHome / avgGoalsLeague;
        const attackStrengthB = goalsForAway / avgGoalsLeague;
        const defenseStrengthB = goalsAgainstAway / avgGoalsLeague;

        const lambdaA = attackStrengthA * defenseStrengthB * avgGoalsLeague;
        const lambdaB = attackStrengthB * defenseStrengthA * avgGoalsLeague;

        const poissonProb = (lambda, k) => (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
        const factorial = (n) => (n <= 1) ? 1 : n * factorial(n - 1);

        let probA = 0, probB = 0, probDraw = 0;

        for (let a = 0; a <= 5; a++) {
            for (let b = 0; b <= 5; b++) {
                const prob = poissonProb(lambdaA, a) * poissonProb(lambdaB, b);
                if (a > b) probA += prob;
                else if (b > a) probB += prob;
                else probDraw += prob;
            }
        }

        const totalProb = probA + probB + probDraw;
        const probA_norm = probA / totalProb;
        const probB_norm = probB / totalProb;
        const probDraw_norm = probDraw / totalProb;

        const marginFactor = 1 + Number(margin) / 100;
        const oddsA_dec = 1 / (probA_norm * marginFactor);
        const oddsB_dec = 1 / (probB_norm * marginFactor);
        const oddsDraw_dec = 1 / (probDraw_norm * marginFactor);

        setResults({
            probA: (probA_norm * 100).toFixed(2),
            oddsA_dec: oddsA_dec.toFixed(2),
            oddsA_frac: toFractional(oddsA_dec),
            oddsA_us: toAmerican(oddsA_dec),

            probB: (probB_norm * 100).toFixed(2),
            oddsB_dec: oddsB_dec.toFixed(2),
            oddsB_frac: toFractional(oddsB_dec),
            oddsB_us: toAmerican(oddsB_dec),

            probDraw: (probDraw_norm * 100).toFixed(2),
            oddsDraw_dec: oddsDraw_dec.toFixed(2),
            oddsDraw_frac: toFractional(oddsDraw_dec),
            oddsDraw_us: toAmerican(oddsDraw_dec),
        });
    };

    // --- Main Calculation Handler ---

    const handleCalculate = () => {
        setError('');
        if (method === 'elo') {
            calculateEloOdds();
        } else if (method === 'poisson') {
            calculatePoissonOdds();
        }
    };

    return (
        <div className="calculator-container">
            <MethodSelector method={method} setMethod={setMethod} />

            {method === 'poisson' && (
                <div className="input-group">
                    <label>League Code:</label>
                    <input type="text" value={leagueId} onChange={e => setLeagueId(e.target.value)} />
                    <label>Home Team ID:</label>
                    <input type="text" value={teamAId} onChange={e => setTeamAId(e.target.value)} />
                    <label>Away Team ID:</label>
                    <input type="text" value={teamBId} onChange={e => setTeamBId(e.target.value)} />
                    <button onClick={fetchTeamData} disabled={loading} className="calculate-btn">
                        {loading ? 'Loading...' : 'Fetch Data from www.football-data.org'}
                    </button>
                </div>
            )}
            
            {method === 'elo' && (
                <>
                    <div className="input-group">
                        <h3>ELO Ratings ({teamAName} vs {teamBName})</h3>
                        <label>Team A ELO ({teamAName}):</label>
                        <input type="number" value={eloA} onChange={e => setEloA(e.target.value)} />
                        <label>Team B ELO ({teamBName}):</label>
                        <input type="number" value={eloB} onChange={e => setEloB(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <h3>Adjustments</h3>
                        <label>Home Advantage (ELO):</label>
                        <input type="number" value={eloHomeAdvantage} onChange={e => setEloHomeAdvantage(e.target.value)} />
                        <label>Other Adjustments for ({teamAName})(Injuries, Form):</label>
                        <input type="number" value={eloAdjustmentsA} onChange={e => setEloAdjustmentsA(e.target.value)} />
                        <label>Other Adjustments for ({teamBName}) (Injuries, Form):</label>
                        <input type="number" value={eloAdjustmentsB} onChange={e => setEloAdjustmentsB(e.target.value)} />
                    </div>
                </>
            )}

            {method === 'poisson' && (
                <>
                    <div className="input-group">
                        <h3>Avg League Stats ({leagueId})</h3>
                        <label>Avg Goals per League:</label>
                        <input type="number" step="0.01" value={avgGoalsLeague} onChange={e => setAvgGoalsLeague(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <h3>Home Team Stats</h3>
                        <label>Avg Goals Scored at Home by {teamAName}:</label>
                        <input type="number" step="0.01" value={goalsForHome} onChange={e => setGoalsForHome(e.target.value)} />
                        <label>Avg Goals Conceded at Home by {teamAName}:</label>
                        <input type="number" step="0.01" value={goalsAgainstHome} onChange={e => setGoalsAgainstHome(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <h3>Away Team Stats</h3>
                        <label>Avg Goals Scored Away by {teamBName}:</label>
                        <input type="number" step="0.01" value={goalsForAway} onChange={e => setGoalsForAway(e.target.value)} />
                        <label>Avg Goals Conceded Away by {teamBName}:</label>
                        <input type="number" step="0.01" value={goalsAgainstAway} onChange={e => setGoalsAgainstAway(e.target.value)} />
                    </div>
                </>
            )}
            
            <div className="input-group">
                <h3>Margin Settings</h3>
                <label>Bookmaker Margin (%):</label>
                <input type="number" value={margin} onChange={e => setMargin(e.target.value)} />
            </div>

            <button className="calculate-btn" onClick={handleCalculate} disabled={loading}>Calculate Odds</button>
            {results && (
                <div className="results-container">
                    <div className="result-card">
                        <p>{teamAName} Win:</p>
                        <p>Probability: <strong>{results.probA}%</strong></p>
                        <p>Decimal Odds: <strong>{results.oddsA_dec}</strong></p>
                        <p>Fractional Odds: <strong>{results.oddsA_frac}</strong></p>
                        <p>American Odds: <strong>{results.oddsA_us}</strong></p>
                    </div>
                    <div className="result-card">
                        <p>Draw:</p>
                        <p>Probability: <strong>{results.probDraw}%</strong></p>
                        <p>Decimal Odds: <strong>{results.oddsDraw_dec}</strong></p>
                        <p>Fractional Odds: <strong>{results.oddsDraw_frac}</strong></p>
                        <p>American Odds: <strong>{results.oddsDraw_us}</strong></p>
                    </div>
                    <div className="result-card">
                        <p>{teamBName} Win:</p>
                        <p>Probability: <strong>{results.probB}%</strong></p>
                        <p>Decimal Odds: <strong>{results.oddsB_dec}</strong></p>
                        <p>Fractional Odds: <strong>{results.oddsB_frac}</strong></p>
                        <p>American Odds: <strong>{results.oddsB_us}</strong></p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OddsCalculator;