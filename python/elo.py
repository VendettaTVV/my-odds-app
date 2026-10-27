import sqlite3
import pandas as pd
import json
import os

# Connect to the SQLite database
con = sqlite3.connect("football.db")
df = pd.read_sql("SELECT Date, HomeTeam, AwayTeam, FTHG, FTAG FROM matches", con)

# Parse date and sort chronologically to ensure accurate historical rating updates
df["Date"] = pd.to_datetime(df["Date"], format='mixed', dayfirst=True)
df = df.sort_values("Date")

ratings = {}
K = 28          # Sensitivity parameter (K-factor)
HOME = 40       # Home Field Advantage rating bonus

for _, m in df.iterrows():
    rh = ratings.get(m.HomeTeam, 1500)
    ra = ratings.get(m.AwayTeam, 1500)
    
    # Calculate expected outcome for the home team
    expected = 1 / (1 + 10 ** ((ra - (rh + HOME)) / 400))
    
    # Determine actual outcome (1 for home win, 0.5 for draw, 0 for away win)
    if m.FTHG > m.FTAG: actual = 1
    elif m.FTHG == m.FTAG: actual = 0.5
    else: actual = 0
    
    # --- Margin of Victory (MoV) Multiplier ---
    gd = abs(m.FTHG - m.FTAG)
    if gd <= 1:
        mov = 1.0
    elif gd == 2:
        mov = 1.5
    else:
        mov = (11 + gd) / 8.0
        
    # Scale rating change by K-factor, match dominance (MoV), and prediction error
    change = K * mov * (actual - expected)
    
    ratings[m.HomeTeam] = rh + change
    ratings[m.AwayTeam] = ra - change

# Export ratings to the React public directory
os.makedirs('../public/data', exist_ok=True)
with open("../public/data/elo.json", "w") as f:
    json.dump({t: round(r) for t, r in ratings.items()}, f, indent=4)

# Print Top 10 ELO Ratings for verification
print("Top 10 ELO Ratings:")
for team, r in sorted(ratings.items(), key=lambda x: -x[1])[:10]:
    print(f"{team:20} {r:.0f}")
print("\nELO data successfully saved to public/data/elo.json")