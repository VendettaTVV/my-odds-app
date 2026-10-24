# Quantitative Sports Pricing Dashboard (1X2 Markets)

**Live Demo:** [https://vendettatvv.github.io/my-odds-app/](https://vendettatvv.github.io/my-odds-app/)

A professional-grade pricing dashboard and data pipeline designed to simulate the toolset of quantitative analysts and sports traders. The project calculates "True Odds" for football (soccer) matches using historical data, applies custom bookmaker margins (overround), and provides correct score probability matrices.

## 🏗 Architecture

To maintain a fast, serverless frontend hosted on GitHub Pages, the architecture is split into an offline Data Engineering pipeline and a dynamic React frontend.

1. **Data Pipeline (Python & SQLite):** Parses historical CSV match data, processes it through quantitative models, and exports static JSON files.
2. **Frontend (React):** Consumes the generated JSON data to calculate real-time probabilities, odds, and sensitivity matrices without requiring a live backend.

## 🧮 Mathematical Models

### 1. ELO Rating System (Dynamic Form)
- Ratings are recalculated match-by-match based on expected vs. actual outcomes.
- **Model Calibration:** The parameters were backtested and optimized against 4 seasons of Premier League data (minimizing prediction error/Brier Score), resulting in a calibrated **K-factor of 28** and a **Home Advantage of 40 ELO points**.

### 2. Poisson Distribution (Expected Goals)
- Forecasts the exact scoreline probabilities (0-0, 2-1, etc.).
- **Rolling Window:** Instead of relying on static historical averages, the Python pipeline uses `pandas` to calculate attack and defense strengths based strictly on a **38-game rolling window**, ensuring the model reacts to current team form.

### 3. Risk & Margin Management
- Features a dynamic Margin (%) input to simulate how bookmakers compress true odds to guarantee an overround.
- Includes an ELO Sensitivity Matrix to visualize how odds shift when a team's rating changes (e.g., due to a red card or key injury in-play).

## 🛠 Tech Stack
- **Frontend:** React 19, Tailwind CSS, Lucide Icons.
- **Data Engineering:** Python 3, Pandas, SQLite3.
- **Deployment:** GitHub Pages (CI/CD via gh-pages).

## 🚀 How to Run Locally

### 1. Update the Data (Python Pipeline)
Navigate to the `python` directory and run the scripts to fetch the latest EPL data, calculate ratings, and generate the JSON feeds:
```bash
cd python
pip install pandas
python load_data.py    # Fetches 4 seasons of data into SQLite
python elo.py          # Calibrates and exports elo.json
python export.py       # Calculates rolling xG and exports teams.json