import sqlite3
import pandas as pd

# 1. Connect to the database and load match history
con = sqlite3.connect("football.db")
df = pd.read_sql("SELECT Date, HomeTeam, AwayTeam, FTHG, FTAG FROM matches", con)
con.close()

# 2. Parse dates and sort chronologically for backtesting
df["Date"] = pd.to_datetime(df["Date"], format='mixed', dayfirst=True)
df = df.sort_values("Date")

best_k = 20
best_home = 100
lowest_error = float('inf')

print("Running parameter grid search (this will take a few seconds)...")

# 3. Grid Search: Iterate K-factor from 10 to 50
for K in range(10, 52, 2):
    # Iterate Home Field Advantage from 20 to 120
    for HOME in range(20, 130, 10):
        ratings = {}
        error = 0
        matches_counted = 0

        for _, m in df.iterrows():
            rh = ratings.get(m.HomeTeam, 1500)
            ra = ratings.get(m.AwayTeam, 1500)

            # Calculate expected win probability for the home team
            expected_home = 1 / (1 + 10 ** ((ra - (rh + HOME)) / 400))
            
            # Actual match outcome (1 for home win, 0.5 for draw, 0 for away win)
            if m.FTHG > m.FTAG: actual_home = 1
            elif m.FTHG == m.FTAG: actual_home = 0.5
            else: actual_home = 0

            # Calculate prediction error (Brier Score)
            # Skip the first season (380 matches) to let team ratings "warm up"
            if matches_counted > 380:
                error += (expected_home - actual_home) ** 2

            # Update ELO ratings based on prediction error
            change = K * (actual_home - expected_home)
            ratings[m.HomeTeam] = rh + change
            ratings[m.AwayTeam] = ra - change
            
            matches_counted += 1

        # Keep track of parameters that yield the lowest cumulative error
        if error < lowest_error:
            lowest_error = error
            best_k = K
            best_home = HOME

print("Optimization completed!")
print(f"Optimal K-factor for the league: {best_k}")
print(f"Optimal Home Field Advantage (HFA): {best_home}")