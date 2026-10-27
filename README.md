# Quantitative Sports Pricing Dashboard & Risk Terminal (1X2 Markets)

**Live Demo:** [https://vendettatvv.github.io/my-odds-app/](https://vendettatvv.github.io/my-odds-app/)

A professional-grade sports pricing dashboard and risk management terminal designed to simulate the toolset of quantitative analysts and traders. The project calculates "True Odds" for football matches using advanced statistical models, applies bookmaker margins with market bias, and features a real-time risk desk to track liability and P&L.

## 🏗 Architecture

To maintain a fast, serverless frontend hosted on GitHub Pages, the architecture separates the offline data engineering pipeline from the dynamic React interface:

1. **Data Pipeline (Python & SQLite):** Processes historical match data, computes team ratings and expected goals, and exports static JSON feeds.
2. **Frontend (React):** Consumes the JSON data to deliver a real-time pricing terminal, risk manager, and sensitivity matrices without needing a live server backend.

## 🧮 Core Features & Models

### 1. Dual Pricing Engines (Poisson & ELO)
- **Poisson Distribution (with Dixon-Coles Correction):** Forecasts exact scorelines and 1X2 probabilities based on team attack/defense strengths, incorporating a low-score correction for realistic draw frequencies.
- **ELO Rating System:** Evaluates match probabilities dynamically using team ratings, calibrated Home Field Advantage, and custom draw margins.

### 2. Risk Manager & Hybrid Market Pricing
- **80/20 Market Blending:** Bridges quantitative model probabilities with incoming betting volume distributions to simulate realistic bookmaker line adjustments.
- **Live P&L & Liability Tracking:** Instantly calculates bookmaker profit and exposure across all match outcomes based on active betting pools.
- **Elastic Margin Protection:** Automatically adjusts and expands bookoverrounds during extreme manual odds overrides to prevent sharp arbitrage risks.

### 3. Analytical Matrices
- **Correct Score Heatmap:** Visualizes match scoreline probabilities (0-4 grid backed by deep data integration).
- **ELO Sensitivity Matrix:** Demonstrates how market pricing shifts in response to team rating fluctuations.

## 🛠 Tech Stack
- **Frontend:** React, Tailwind CSS, Lucide Icons.
- **Data Engineering:** Python, Pandas, SQLite3.
- **Deployment:** GitHub Pages.

## 🚀 How to Run Locally

### 1. Update the Data (Python Pipeline)
Navigate to the `python` directory and run the scripts to fetch data, compute ratings, and generate JSON feeds:
```bash
cd python
pip install pandas
python load_data.py    # Populates SQLite database
python elo.py          # Calibrates and exports elo.json
python export.py       # Computes metrics and exports teams.json