// The three outcomes of a 1X2 market and their display metadata.
export const OUTCOMES = ['home', 'draw', 'away'];

export const OUTCOME_META = {
  home: { label: 'HOME (1)', short: 'HOME', color: 'text-green-400' },
  draw: { label: 'DRAW (X)', short: 'DRAW', color: 'text-yellow-400' },
  away: { label: 'AWAY (2)', short: 'AWAY', color: 'text-red-400' }
};

/** Builds { home, draw, away } by calling fn for each outcome. */
export const mapOutcomes = (fn) =>
  Object.fromEntries(OUTCOMES.map((outcome) => [outcome, fn(outcome)]));
