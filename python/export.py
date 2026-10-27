import sqlite3
import pandas as pd
import json
import os

# 1. Connect to the database and load match history
con = sqlite3.connect('football.db')
df = pd.read_sql_query("SELECT Date, HomeTeam, AwayTeam, FTHG, FTAG FROM matches", con)
con.close()

# 2. Parse dates correctly and sort from newest to oldest for recent-form analysis
df["Date"] = pd.to_datetime(df["Date"], format='mixed', dayfirst=True)
df = df.sort_values("Date", ascending=False)

teams_data = {}
all_teams = pd.concat([df['HomeTeam'], df['AwayTeam']]).unique()

# 3. Calculate team statistics using Time Decay weighting over the last 38 matches
for team in all_teams:
    # Filter matches where the team participated and take the most recent 38 games
    team_matches = df[(df['HomeTeam'] == team) | (df['AwayTeam'] == team)].head(38)
    
    if len(team_matches) == 0:
        continue
        
    scored = 0
    conceded = 0
    total_weight = 0
    
    for i, (_, m) in enumerate(team_matches.iterrows()):
        # Linear time decay: Most recent match (i=0) has weight 1.0, older matches decay down to 0.26
        weight = max(0.1, 1.0 - (i * 0.02)) 
        total_weight += weight
        
        if m['HomeTeam'] == team:
            scored += m['FTHG'] * weight
            conceded += m['FTAG'] * weight
        else:
            scored += m['FTAG'] * weight
            conceded += m['FTHG'] * weight
            
    # Compute weighted average expected goals (xG) emphasizing current team form
    teams_data[team] = {
        "attack_xg": round(scored / total_weight, 2),
        "defense_xg": round(conceded / total_weight, 2)
    }

# 4. Export processed datasets to the React public directory
os.makedirs('../public/data', exist_ok=True)
with open('../public/data/teams.json', 'w', encoding='utf-8') as f:
    json.dump(teams_data, f, indent=4)

print("Success! Dynamic xG metrics with Time Decay have been saved to public/data/teams.json")