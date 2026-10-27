import pandas as pd
import sqlite3

seasons = ["2223", "2324", "2425", "2526"]
frames = []

for s in seasons:
    url = f"https://www.football-data.co.uk/mmz4281/{s}/E0.csv"
    frames.append(pd.read_csv(url))

df = pd.concat(frames, ignore_index=True)
cols = ["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG"]

con = sqlite3.connect("football.db")
df[cols].to_sql("matches", con, if_exists="replace", index=False)

print(f"Loaded matches: {len(df)}")