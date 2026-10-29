import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

const TEAMS_JSON = {
  params: { avg_home_goals: 1.6, avg_away_goals: 1.3, dc_rho: -0.1 },
  teams: {
    Arsenal: { attack: 1.84, defense: 0.74 },
    Chelsea: { attack: 1.5, defense: 1.2 }
  }
};
const ELO_JSON = {
  params: { home_adv: 40, draw_margin: 95 },
  ratings: { Arsenal: 1750, Chelsea: 1520 }
};

const jsonResponse = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

afterEach(() => {
  delete global.fetch;
});

test('renders the terminal with teams loaded from the exported data', async () => {
  global.fetch = jest.fn((url) => jsonResponse(url.endsWith('teams.json') ? TEAMS_JSON : ELO_JSON));
  render(<App />);

  expect(screen.getByText('ODDS ANALYSER')).toBeInTheDocument();
  expect(await screen.findByRole('option', { name: 'Chelsea', selected: true })).toBeInTheDocument();
  expect(screen.getByText('Correct Score Matrix (Display 0-4, Integrated 0-10)')).toBeInTheDocument();
});

test('switching to ELO shows calibrated parameters and keeps the team selection', async () => {
  global.fetch = jest.fn((url) => jsonResponse(url.endsWith('teams.json') ? TEAMS_JSON : ELO_JSON));
  render(<App />);

  fireEvent.change(await screen.findByLabelText('Home Team'), { target: { value: 'Chelsea' } });
  fireEvent.change(screen.getByLabelText('Away Team'), { target: { value: 'Arsenal' } });
  fireEvent.click(screen.getByText('ELO Rating System'));

  expect(await screen.findByText('HFA = +40 · Draw = ±95')).toBeInTheDocument();
  expect(screen.getByLabelText('Home Team')).toHaveValue('Chelsea');
  expect(screen.getByLabelText('Away Team')).toHaveValue('Arsenal');
  expect(screen.getByText('ELO 1520')).toBeInTheDocument();
  expect(screen.getByText('ELO 1750')).toBeInTheDocument();
});

test('falls back to manual input and reports failed data loads', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404 }));
  render(<App />);

  expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 404');
  expect(screen.getByLabelText('Home Team λ (expected goals)')).toHaveValue(1.5);
});
