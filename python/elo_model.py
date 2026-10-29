"""Shared data loading and ELO model used by elo.py, optimize_elo.py and export.py.

Keeping the model in one place guarantees that the parameters found by the
optimizer are exactly the ones the production rating script runs with.
"""
import json
import os
import sqlite3

import numpy as np
import pandas as pd

DB_PATH = "football.db"
OUTPUT_DIR = "../public/data"
PARAMS_PATH = "elo_params.json"   # written by optimize_elo.py, read by elo.py

START_RATING = 1500
DEFAULT_PARAMS = {"k": 28, "home_adv": 40, "draw_margin": 60, "use_mov": True}


def load_matches():
    """Load all matches from SQLite, parse dates and sort chronologically."""
    con = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT Date, HomeTeam, AwayTeam, FTHG, FTAG FROM matches", con)
    con.close()

    # Dates are British (day first) and the year format differs between seasons
    df["Date"] = pd.to_datetime(df["Date"], format="mixed", dayfirst=True)
    # Season is labelled by its starting year: Aug 2022 - May 2023 -> 2022
    df["Season"] = np.where(df["Date"].dt.month >= 7, df["Date"].dt.year, df["Date"].dt.year - 1)
    return df.sort_values("Date", kind="stable").reset_index(drop=True)


def current_teams(df):
    """Teams that played in the most recent season (relegated clubs are dropped)."""
    latest = df[df["Season"] == df["Season"].max()]
    return set(latest["HomeTeam"]) | set(latest["AwayTeam"])


def match_outcomes(df):
    """Encode results as 0 = home win, 1 = draw, 2 = away win."""
    return np.select([df["FTHG"] > df["FTAG"], df["FTHG"] == df["FTAG"]], [0, 1], 2)


def mov_multiplier(goal_diff):
    """Margin of Victory multiplier (World Football Elo): bigger wins move ratings more."""
    if goal_diff <= 1:
        return 1.0
    if goal_diff == 2:
        return 1.5
    return (11 + goal_diff) / 8.0


def run_elo(df, k, home_adv, use_mov=True):
    """Replay the match history and return final ratings plus every pre-match ELO difference.

    The pre-match difference (home + HFA - away) is what a forecast would have used
    before kick-off, so it can be scored without any look-ahead.
    """
    ratings = {}
    diffs = np.empty(len(df))

    rows = zip(df["HomeTeam"], df["AwayTeam"], df["FTHG"], df["FTAG"])
    for idx, (home, away, home_goals, away_goals) in enumerate(rows):
        rh = ratings.get(home, START_RATING)
        ra = ratings.get(away, START_RATING)

        diff = rh + home_adv - ra
        diffs[idx] = diff

        # Expected score for the home team (win = 1, draw = 0.5, loss = 0)
        expected = 1 / (1 + 10 ** (-diff / 400))
        if home_goals > away_goals:
            actual = 1.0
        elif home_goals == away_goals:
            actual = 0.5
        else:
            actual = 0.0

        mov = mov_multiplier(abs(home_goals - away_goals)) if use_mov else 1.0
        change = k * mov * (actual - expected)

        # Zero-sum update: the home team gains exactly what the away team loses
        ratings[home] = rh + change
        ratings[away] = ra - change

    return ratings, diffs


def outcome_probs(elo_diff, draw_margin):
    """1X2 probabilities from an ELO difference using a symmetric draw threshold.

    Works on scalars and numpy arrays. Mirrors eloProbs() in src/pricing.js.
    """
    home = 1 / (1 + 10 ** (-(elo_diff - draw_margin) / 400))
    away = 1 / (1 + 10 ** ((elo_diff + draw_margin) / 400))
    draw = np.clip(1 - home - away, 0, None)
    total = home + draw + away
    return home / total, draw / total, away / total


def brier_1x2(diffs, outcomes, draw_margin):
    """Mean multiclass Brier score over three outcomes (0 = perfect, lower is better)."""
    probs = np.column_stack(outcome_probs(diffs, draw_margin))
    actual = np.eye(3)[outcomes]
    return float(np.mean(np.sum((probs - actual) ** 2, axis=1)))


def load_params():
    """Calibrated parameters from optimize_elo.py, or defaults if it has not been run."""
    if os.path.exists(PARAMS_PATH):
        with open(PARAMS_PATH) as f:
            return {**DEFAULT_PARAMS, **json.load(f)}
    print(f"{PARAMS_PATH} not found, using default parameters (run optimize_elo.py)")
    return dict(DEFAULT_PARAMS)


def write_public_json(filename, data):
    """Export a dataset into the React public directory."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    return path
