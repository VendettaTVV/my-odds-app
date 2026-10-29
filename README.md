# Quantitative Sports Pricing Dashboard & Risk Terminal (1X2 Markets)

**Live Demo:** [https://vendettatvv.github.io/my-odds-app/](https://vendettatvv.github.io/my-odds-app/)

A sports pricing dashboard and risk management terminal that simulates the toolset of quantitative analysts and traders. The project calculates "True Odds" for Premier League matches using statistical models, applies bookmaker margins with market bias, and features a risk desk to track liability and P&L.

## 🏗 Architecture

To keep a fast, serverless frontend hosted on GitHub Pages, the offline data pipeline is separated from the React interface:

1. **Data Pipeline (Python & SQLite):** Loads historical match data, calibrates and computes team ratings and scoring strengths, and exports static JSON feeds that contain both the data and the model parameters.
2. **Frontend (React):** Consumes the JSON feeds to deliver a pricing terminal, risk manager and sensitivity matrices without a live backend.

```
football-data.co.uk ─► load_data.py ─► football.db ─┬─► optimize_elo.py ─► elo_params.json
                                                    ├─► elo.py ──────────► public/data/elo.json
                                                    └─► export.py ───────► public/data/teams.json
```

## 🧮 Core Features & Models

### 1. Dual Pricing Engines (Poisson & ELO)
- **Poisson Distribution (with Dixon-Coles Correction):** Forecasts exact scorelines and 1X2 probabilities from time-decay weighted attack/defense strengths (Maher's multiplicative model) with home advantage taken from league home/away scoring rates, plus a low-score correction for realistic draw frequencies.
- **ELO Rating System:** 1X2 probabilities from team ratings with a symmetric draw threshold. K-factor, Home Field Advantage, draw threshold and the Margin-of-Victory option are calibrated by a **walk-forward grid search** (warm-up season → training seasons → hold-out season) minimising the multiclass Brier score.

### 2. Risk Manager & Hybrid Market Pricing
- **80/20 Market Blending:** Blends model probabilities with the distribution of betting volume to simulate bookmaker line adjustments.
- **Live P&L & Liability Tracking:** Bookmaker profit and exposure for every outcome based on the betting pool.
- **Elastic Margin Protection:** When one price is overridden manually, the other two are re-priced; an extreme override widens the overround instead of pushing prices to arbitrage levels.
- **Favourite-Longshot Bias:** Margin is shifted from favourites towards longshots.

### 3. Analytical Matrices
- **Correct Score Heatmap:** Scoreline probabilities (0-4 displayed, 0-10 integrated).
- **ELO Sensitivity Matrix:** How prices move when a team's rating is shifted by ±15 / ±30.

## 📁 Project Structure

| Path | Purpose |
|---|---|
| `python/elo_model.py` | Shared data loading and ELO model used by every script |
| `python/optimize_elo.py` | Walk-forward calibration, writes `elo_params.json` |
| `python/elo.py`, `python/export.py` | Export ELO ratings and Poisson strengths with their parameters |
| `src/pricing.js` | Pure pricing maths (Poisson, ELO, margin, blending, rebalancing, P&L) |
| `src/useModelData.js` | Loads the JSON feeds with error handling |
| `src/OddsCalculator.js` | Wires state to the pricing functions |
| `src/RiskManager.js`, `src/ScoreHeatmap.js`, `src/SensitivityTable.js` | UI sections |

## 🛠 Tech Stack
- **Frontend:** React, Tailwind CSS, Lucide Icons, Jest + Testing Library.
- **Data Engineering:** Python, Pandas, NumPy, SQLite3.
- **Deployment:** GitHub Pages.

## 🚀 How to Run Locally

### 1. Update the Data (Python Pipeline)
```bash
cd python
pip install pandas numpy
python load_data.py      # Downloads seasons into the SQLite database
python optimize_elo.py   # Calibrates ELO parameters, writes elo_params.json
python elo.py            # Exports public/data/elo.json
python export.py         # Exports public/data/teams.json
```

### 2. Run the Frontend
```bash
npm install
npm start                # Dev server on http://localhost:3000
npm test                 # Unit and component tests
npm run deploy           # Build and publish to GitHub Pages
```

## ⚠️ Known Limitations
- Team strengths use actual goals rather than shot-based xG.
- The Dixon-Coles ρ is a fixed literature value (−0.10), not fitted by maximum likelihood.
- Data is refreshed only when the pipeline is re-run and the site redeployed.
