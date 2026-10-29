from elo_model import load_matches, current_teams, load_params, run_elo, write_public_json

# 1. Load match history and the parameters calibrated by optimize_elo.py
df = load_matches()
params = load_params()

# 2. Replay every match in chronological order to get current ratings
ratings, _ = run_elo(df, params["k"], params["home_adv"], params["use_mov"])

# 3. Export ratings of current-season teams together with the model parameters,
#    so the frontend never has to hard-code them
teams = current_teams(df)
path = write_public_json("elo.json", {
    "params": {"home_adv": params["home_adv"], "draw_margin": params["draw_margin"]},
    "ratings": {t: round(r) for t, r in sorted(ratings.items()) if t in teams},
})

# Print Top 10 ELO Ratings for verification
print(f"Parameters: {params}")
print("Top 10 ELO Ratings:")
for team, r in sorted(ratings.items(), key=lambda x: -x[1])[:10]:
    print(f"{team:20} {r:.0f}")
print(f"\nELO data successfully saved to {path}")
