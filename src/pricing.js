/**
 * Pure pricing functions: probability models, margin, market blending and risk.
 * No React here, so everything is unit-tested in pricing.test.js.
 * All odds are returned as numbers; formatting happens only in the UI.
 */
import { OUTCOMES, mapOutcomes } from './outcomes';

// Fallbacks used when the exported JSON parameters are unavailable
export const DEFAULT_POISSON_PARAMS = { avgHomeGoals: 1.62, avgAwayGoals: 1.34, dcRho: -0.1 };
export const DEFAULT_ELO_PARAMS = { homeAdv: 40, drawMargin: 95 };

export const MAX_GOALS = 10;           // scorelines are integrated up to 10:10 to avoid tail loss
export const MIN_LAMBDA = 0.05;
export const MARKET_WEIGHT = 0.2;      // 80% model, 20% betting volume
export const MIN_REMAINING_SHARE = 0.6;
export const SENSITIVITY_SHIFTS = [30, 15, 0, -15, -30];

/* ---------- Poisson (Dixon-Coles) ---------- */

const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));

/** Probability of scoring exactly k goals when lambda goals are expected. */
export const poissonProb = (k, lambda) => (lambda ** k * Math.exp(-lambda)) / factorial(k);

/**
 * Maher's multiplicative model with home advantage.
 * An average team vs an average team gets exactly the league home / away scoring rates.
 */
export function poissonLambdas(home, away, { avgHomeGoals, avgAwayGoals }) {
  const avgGoals = (avgHomeGoals + avgAwayGoals) / 2;
  return {
    home: ((home.attack * away.defense) / avgGoals) * (avgHomeGoals / avgGoals),
    away: ((away.attack * home.defense) / avgGoals) * (avgAwayGoals / avgGoals)
  };
}

/** Dixon-Coles adjustment for the low-scoring results 0:0, 0:1, 1:0 and 1:1. */
export function dixonColesTau(i, j, lambdaHome, lambdaAway, rho) {
  if (i === 0 && j === 0) return 1 - lambdaHome * lambdaAway * rho;
  if (i === 0 && j === 1) return 1 + lambdaHome * rho;
  if (i === 1 && j === 0) return 1 + lambdaAway * rho;
  if (i === 1 && j === 1) return 1 - rho;
  return 1;
}

/**
 * Full correct-score matrix (matrix[homeGoals][awayGoals]) and 1X2 probabilities,
 * both normalised so that they sum to exactly 1.
 */
export function poissonOutcome(lambdaHome, lambdaAway, { dcRho }) {
  const lh = Math.max(MIN_LAMBDA, lambdaHome);
  const la = Math.max(MIN_LAMBDA, lambdaAway);

  const raw = [];
  let total = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    const row = [];
    for (let j = 0; j <= MAX_GOALS; j++) {
      const prob = Math.max(0, poissonProb(i, lh) * poissonProb(j, la) * dixonColesTau(i, j, lh, la, dcRho));
      row.push(prob);
      total += prob;
    }
    raw.push(row);
  }

  const matrix = raw.map((row) => row.map((prob) => prob / total));
  const probs = { home: 0, draw: 0, away: 0 };
  matrix.forEach((row, i) =>
    row.forEach((prob, j) => {
      if (i > j) probs.home += prob;
      else if (i === j) probs.draw += prob;
      else probs.away += prob;
    })
  );
  return { probs, matrix };
}

/* ---------- ELO ---------- */

/**
 * 1X2 probabilities from two ratings. A symmetric draw threshold (drawMargin)
 * splits the classic win/loss curve into three outcomes. Mirrors outcome_probs()
 * in python/elo_model.py, where drawMargin is calibrated.
 */
export function eloProbs(homeElo, awayElo, { homeAdv, drawMargin }) {
  const eloDiff = homeElo + homeAdv - awayElo;
  const home = 1 / (1 + 10 ** (-(eloDiff - drawMargin) / 400));
  const away = 1 / (1 + 10 ** ((eloDiff + drawMargin) / 400));
  const draw = Math.max(0, 1 - home - away);
  const total = home + draw + away;
  return { home: home / total, draw: draw / total, away: away / total };
}

/** How the 1X2 probabilities move when one side's rating is shifted. */
export function eloSensitivity(homeElo, awayElo, params, side) {
  return SENSITIVITY_SHIFTS.map((shift) => {
    const newHome = side === 'home' ? homeElo + shift : homeElo;
    const newAway = side === 'away' ? awayElo + shift : awayElo;
    return {
      shift,
      newElo: side === 'home' ? newHome : newAway,
      probs: eloProbs(newHome, newAway, params)
    };
  });
}

/* ---------- Margin, market and risk ---------- */

/**
 * Fair probability -> bookmaker odds with margin and Favourite-Longshot Bias:
 * favourites (>= 55%) carry half the margin, longshots (<= 25%) carry 1.5x.
 */
export function oddsWithMargin(prob, marginPct) {
  if (!(prob > 0)) return 0;
  let m = marginPct / 100;
  if (prob >= 0.55) m *= 0.5;
  else if (prob <= 0.25) m *= 1.5;
  return 1 / (prob * (1 + m));
}

/** Actual book margin in percent: sum of implied probabilities minus 100%. */
export function bookMarginPct(odds) {
  if (OUTCOMES.some((o) => !(odds[o] > 0))) return 0;
  return (OUTCOMES.reduce((sum, o) => sum + 1 / odds[o], 0) - 1) * 100;
}

/** Blends model probabilities with the share of money staked on each outcome. */
export function blendWithMarket(probs, volumes, weight = MARKET_WEIGHT) {
  const total = OUTCOMES.reduce((sum, o) => sum + volumes[o], 0);
  if (total <= 0) return probs;
  return mapOutcomes((o) => probs[o] * (1 - weight) + (volumes[o] / total) * weight);
}

/** Odds that apply the target overround evenly to the blended probabilities. */
export function suggestedOdds(blended, marginPct) {
  const overround = 1 + marginPct / 100;
  return mapOutcomes((o) => 1 / (blended[o] * overround));
}

/**
 * After a manual override of one outcome, re-prices the other two in proportion
 * to their blended weights so the book keeps its target overround.
 * Elastic margin: the other two keep at least MIN_REMAINING_SHARE of their
 * baseline implied probability, so an extreme override widens the book
 * instead of pushing the other prices to arbitrage levels.
 */
export function rebalanceOdds(changed, newOdds, blended, marginPct, minShare = MIN_REMAINING_SHARE) {
  const overround = 1 + marginPct / 100;
  const others = OUTCOMES.filter((o) => o !== changed);
  const othersWeight = others.reduce((sum, o) => sum + blended[o], 0);

  const remaining = Math.max(overround - 1 / newOdds, othersWeight * overround * minShare);

  const result = { [changed]: newOdds };
  others.forEach((o) => {
    result[o] = 1 / (remaining * (blended[o] / othersWeight));
  });
  return result;
}

/** Bookmaker profit (positive) or loss (negative) for each possible result. */
export function profitAndLoss(volumes, odds) {
  const total = OUTCOMES.reduce((sum, o) => sum + volumes[o], 0);
  return mapOutcomes((o) => total - volumes[o] * odds[o]);
}
