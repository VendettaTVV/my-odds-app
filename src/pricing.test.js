import {
  poissonProb, poissonLambdas, poissonOutcome, eloProbs, eloSensitivity,
  oddsWithMargin, bookMarginPct, blendWithMarket, suggestedOdds, rebalanceOdds, profitAndLoss
} from './pricing';

const sum = (probs) => probs.home + probs.draw + probs.away;
const ELO_PARAMS = { homeAdv: 40, drawMargin: 60 };

describe('Poisson model', () => {
  test('poissonProb matches the textbook values for lambda = 1.5', () => {
    expect(poissonProb(0, 1.5)).toBeCloseTo(0.2231, 4);
    expect(poissonProb(1, 1.5)).toBeCloseTo(0.3347, 4);
    expect(poissonProb(2, 1.5)).toBeCloseTo(0.2510, 4);
  });

  test('average teams get the league home and away scoring rates', () => {
    const params = { avgHomeGoals: 1.6, avgAwayGoals: 1.2 };
    const average = { attack: 1.4, defense: 1.4 };
    const lambdas = poissonLambdas(average, average, params);
    expect(lambdas.home).toBeCloseTo(1.6);
    expect(lambdas.away).toBeCloseTo(1.2);
  });

  test('1X2 probabilities and the score matrix are normalised', () => {
    const { probs, matrix } = poissonOutcome(1.5, 1.1, { dcRho: -0.1 });
    expect(sum(probs)).toBeCloseTo(1, 10);
    expect(matrix.flat().reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(probs.home).toBeGreaterThan(probs.away);
  });

  test('negative Dixon-Coles rho increases draws compared with independent Poisson', () => {
    const independent = poissonOutcome(1.3, 1.3, { dcRho: 0 }).probs;
    const corrected = poissonOutcome(1.3, 1.3, { dcRho: -0.1 }).probs;
    expect(corrected.draw).toBeGreaterThan(independent.draw);
    expect(independent.home).toBeCloseTo(independent.away, 10);
  });

  test('lambda is clamped so zero input does not break the model', () => {
    const { probs } = poissonOutcome(0, 0, { dcRho: -0.1 });
    expect(sum(probs)).toBeCloseTo(1, 10);
  });
});

describe('ELO model', () => {
  test('worked example: Arsenal 1785 vs Man City 1756', () => {
    const probs = eloProbs(1785, 1756, ELO_PARAMS);
    expect(probs.home).toBeCloseTo(0.513, 2);
    expect(probs.draw).toBeCloseTo(0.164, 2);
    expect(probs.away).toBeCloseTo(0.323, 2);
  });

  test('equal teams without home advantage are symmetric', () => {
    const probs = eloProbs(1500, 1500, { homeAdv: 0, drawMargin: 95 });
    expect(probs.home).toBeCloseTo(probs.away, 10);
    expect(sum(probs)).toBeCloseTo(1, 10);
  });

  test('a wider draw threshold produces more draws', () => {
    const narrow = eloProbs(1500, 1500, { homeAdv: 40, drawMargin: 60 });
    const wide = eloProbs(1500, 1500, { homeAdv: 40, drawMargin: 95 });
    expect(wide.draw).toBeGreaterThan(narrow.draw);
  });

  test('sensitivity: a stronger home rating lowers the home price', () => {
    const rows = eloSensitivity(1600, 1550, ELO_PARAMS, 'home');
    expect(rows.map((r) => r.shift)).toEqual([30, 15, 0, -15, -30]);
    expect(rows[0].newElo).toBe(1630);
    expect(rows[0].probs.home).toBeGreaterThan(rows[4].probs.home);
  });
});

describe('Margin and risk', () => {
  test('zero margin gives fair odds', () => {
    expect(oddsWithMargin(0.5, 0)).toBeCloseTo(2);
    expect(oddsWithMargin(0, 5)).toBe(0);
  });

  test('favourite-longshot bias: favourites carry less margin than longshots', () => {
    expect(oddsWithMargin(0.6, 10)).toBeCloseTo(1 / (0.6 * 1.05));
    expect(oddsWithMargin(0.2, 10)).toBeCloseTo(1 / (0.2 * 1.15));
    expect(oddsWithMargin(0.4, 10)).toBeCloseTo(1 / (0.4 * 1.1));
  });

  test('book margin is the overround above 100%', () => {
    expect(bookMarginPct({ home: 2, draw: 4, away: 4 })).toBeCloseTo(0);
    expect(bookMarginPct({ home: 1.9, draw: 3.8, away: 3.8 })).toBeCloseTo(5.263, 2);
    expect(bookMarginPct({ home: 0, draw: 3, away: 3 })).toBe(0);
  });

  test('market blending moves probabilities towards the money', () => {
    const probs = { home: 0.5, draw: 0.25, away: 0.25 };
    const blended = blendWithMarket(probs, { home: 100, draw: 0, away: 0 });
    expect(blended.home).toBeCloseTo(0.6);
    expect(sum(blended)).toBeCloseTo(1);
    expect(blendWithMarket(probs, { home: 0, draw: 0, away: 0 })).toBe(probs);
  });

  test('suggested odds carry exactly the target overround', () => {
    const odds = suggestedOdds({ home: 0.5, draw: 0.25, away: 0.25 }, 5);
    expect(bookMarginPct(odds)).toBeCloseTo(5);
  });

  test('a moderate override keeps the target overround', () => {
    const blended = { home: 0.5, draw: 0.25, away: 0.25 };
    const odds = rebalanceOdds('home', 1.9, blended, 5);
    expect(odds.home).toBe(1.9);
    expect(odds.draw).toBeCloseTo(odds.away);
    expect(bookMarginPct(odds)).toBeCloseTo(5);
  });

  test('elastic margin: an extreme override widens the book instead of collapsing the others', () => {
    const blended = { home: 0.5, draw: 0.25, away: 0.25 };
    const odds = rebalanceOdds('home', 1.05, blended, 5);
    // The other two keep 60% of their baseline implied probability (0.5 * 1.05 * 0.6)
    expect(1 / odds.draw + 1 / odds.away).toBeCloseTo(0.315);
    expect(bookMarginPct(odds)).toBeGreaterThan(5);
  });

  test('P&L is the pool minus the payout on each outcome', () => {
    const pnl = profitAndLoss({ home: 1000, draw: 300, away: 150 }, { home: 1.8, draw: 4, away: 5 });
    expect(pnl.home).toBeCloseTo(-350);
    expect(pnl.draw).toBeCloseTo(250);
    expect(pnl.away).toBeCloseTo(700);
  });
});
