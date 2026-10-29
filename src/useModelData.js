import { useEffect, useState } from 'react';

async function loadJson(path) {
  const res = await fetch(process.env.PUBLIC_URL + path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

// The Python pipeline writes snake_case; the frontend works with camelCase.
const parsePoisson = ({ params, teams }) => ({
  params: { avgHomeGoals: params.avg_home_goals, avgAwayGoals: params.avg_away_goals, dcRho: params.dc_rho },
  teams
});

const parseElo = ({ params, ratings }) => ({
  params: { homeAdv: params.home_adv, drawMargin: params.draw_margin },
  ratings
});

/**
 * Loads the pre-exported datasets once. Each file is optional: if one fails,
 * that model falls back to manual input and the error is reported to the UI.
 */
function useModelData() {
  const [state, setState] = useState({ loading: true, poisson: null, elo: null, errors: [] });

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      loadJson('/data/teams.json').then(parsePoisson),
      loadJson('/data/elo.json').then(parseElo)
    ]).then(([poisson, elo]) => {
      if (cancelled) return;
      setState({
        loading: false,
        poisson: poisson.status === 'fulfilled' ? poisson.value : null,
        elo: elo.status === 'fulfilled' ? elo.value : null,
        errors: [poisson, elo].filter((r) => r.status === 'rejected').map((r) => r.reason.message)
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export default useModelData;
