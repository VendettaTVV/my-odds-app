# Odds Analyser: Quantitative Pricing Model

**Live Demo:** [https://vendettatvv.github.io/my-odds-app/](https://vendettatvv.github.io/my-odds-app/)

A professional-grade React dashboard designed to calculate True Odds and probabilistic matrices for sports betting markets. This project demonstrates the practical application of mathematical models (Poisson Distribution and ELO Rating System) to generate accurate 1X2 market pricing.

## 🎯 Core Features & Mathematical Engines

The application utilizes two distinct models to evaluate match probabilities, mirroring the workflows used by quantitative analysts and trading departments.

### 1. Poisson Distribution Model (xG Based)
Calculates the probability of exact scorelines based on Expected Goals (xG) or historical scoring averages.
*   **Correct Score Heatmap:** Dynamically generates a 5x5 matrix (from 0:0 to 4:4) visualising the highest probability scorelines.
*   **True Odds Calculation:** Aggregates the probabilities from the matrix to determine the fair baseline odds for Home Win, Draw, and Away Win.
*   **Use Case:** Ideal for pre-match pricing based on advanced xG metrics and underlying team performance data.

### 2. ELO Rating System
Evaluates relative team strength dynamically.
*   **Rating Conversion:** Translates the ELO difference between two teams into an expected win probability.
*   **Market Adjustments:** Automatically factors in standard market parameters, including Home Advantage (+100 ELO points) and Draw Margin adjustments (-60/+60 bounds).
*   **Odds Sensitivity Matrix:** A critical risk-management tool. It simulates how the 1X2 odds line shifts if a team's ELO rating suddenly changes by ±15 or ±30 points (e.g., due to late injury news or weather changes), allowing traders to anticipate market movements.

## 🛠 Technical Stack
*   **Frontend Framework:** React.js (Hooks, Functional Components)
*   **Styling:** Tailwind CSS (Dark-mode, trading terminal aesthetic)
*   **Icons:** Lucide React
*   **Deployment:** GitHub Pages

## 🚀 Local Development

To run this application locally for further modification or testing:

1.  Clone the repository:
    ```bash
    git clone [https://github.com/VendettaTVV/my-odds-app.git](https://github.com/VendettaTVV/my-odds-app.git)
    ```
2.  Navigate to the project directory:
    ```bash
    cd my-odds-app
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Start the development server:
    ```bash
    npm start
    ```
    The app will automatically open in your default browser at `http://localhost:3000`.

## 📈 Future Roadmap
*   **Implied Probability Converter:** Add a feature to input bookmaker odds and extract the implied probability and overround (margin).
*   **Kelly Criterion Calculator:** Implement stake sizing recommendations based on calculated True Odds vs. Market Odds.
*   **Live Data Integration:** Connect to external sports APIs to fetch real-time xG and ELO data dynamically.