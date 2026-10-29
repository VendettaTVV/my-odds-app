from elo_model import load_matches, current_teams, write_public_json

MATCH_WINDOW = 38      # one full season of recent form
DECAY_STEP = 0.02      # weight lost per older match
MIN_WEIGHT = 0.1
DC_RHO = -0.10         # Dixon-Coles low-score correlation (typical value from the literature)

# 1. Load match history, newest first for recent-form analysis
df = load_matches().sort_values("Date", ascending=False)

# 2. League scoring rates. Home teams score more than away teams; the frontend
#    uses this ratio as the home advantage of the Poisson model.
avg_home_goals = df["FTHG"].mean()
avg_away_goals = df["FTAG"].mean()

# 3. Time-decay weighted goals scored / conceded over each team's last 38 matches.
#    These are based on actual goals, not on shot-based xG.
teams_data = {}
for team in sorted(current_teams(df)):
    team_matches = df[(df["HomeTeam"] == team) | (df["AwayTeam"] == team)].head(MATCH_WINDOW)

    scored = conceded = total_weight = 0.0
    for i, m in enumerate(team_matches.itertuples(index=False)):
        # Linear decay: the most recent match (i=0) weighs 1.0, the 38th weighs 0.26
        weight = max(MIN_WEIGHT, 1.0 - i * DECAY_STEP)
        total_weight += weight

        if m.HomeTeam == team:
            scored += m.FTHG * weight
            conceded += m.FTAG * weight
        else:
            scored += m.FTAG * weight
            conceded += m.FTHG * weight

    teams_data[team] = {
        "attack": round(scored / total_weight, 2),     # weighted goals scored per match
        "defense": round(conceded / total_weight, 2),  # weighted goals conceded per match
    }

# 4. Export team strengths together with the league parameters
path = write_public_json("teams.json", {
    "params": {
        "avg_home_goals": round(avg_home_goals, 3),
        "avg_away_goals": round(avg_away_goals, 3),
        "dc_rho": DC_RHO,
    },
    "teams": teams_data,
})

print(f"League averages: home {avg_home_goals:.2f}, away {avg_away_goals:.2f} goals per match")
print(f"Success! Time-decay team strengths saved to {path}")
