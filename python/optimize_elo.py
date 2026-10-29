import json

import numpy as np

from elo_model import PARAMS_PATH, DEFAULT_PARAMS, load_matches, match_outcomes, run_elo, brier_1x2

# 1. Load match history (sorted chronologically)
df = load_matches()
outcomes = match_outcomes(df)

# 2. Walk-forward split:
#    - first season: warm-up only (every team starts at 1500, forecasts are uninformative)
#    - middle seasons: training, used to choose the parameters
#    - last season: hold-out test, never used for selection
seasons = sorted(df["Season"].unique())
warmup, test = seasons[0], seasons[-1]
train_mask = ((df["Season"] > warmup) & (df["Season"] < test)).to_numpy()
test_mask = (df["Season"] == test).to_numpy()

print(f"Warm-up: {warmup}, train: {seasons[1:-1]}, test: {test}")
print("Running parameter grid search...")

DRAW_MARGINS = np.arange(0, 205, 5)
best = {"error": float("inf")}

# 3. Grid search over K-factor, Home Field Advantage, MoV on/off and draw threshold.
#    The draw threshold does not affect rating updates, so for each rating run
#    all thresholds are scored on the same pre-match differences.
for use_mov in (True, False):
    for k in range(10, 52, 2):
        for home_adv in range(0, 130, 10):
            _, diffs = run_elo(df, k, home_adv, use_mov)
            for draw_margin in DRAW_MARGINS:
                error = brier_1x2(diffs[train_mask], outcomes[train_mask], draw_margin)
                if error < best["error"]:
                    best = {"error": error, "k": k, "home_adv": home_adv,
                            "draw_margin": int(draw_margin), "use_mov": use_mov, "diffs": diffs}

# 4. Evaluate the chosen parameters on the hold-out season against two baselines
test_error = brier_1x2(best["diffs"][test_mask], outcomes[test_mask], best["draw_margin"])

_, default_diffs = run_elo(df, DEFAULT_PARAMS["k"], DEFAULT_PARAMS["home_adv"], DEFAULT_PARAMS["use_mov"])
default_error = brier_1x2(default_diffs[test_mask], outcomes[test_mask], DEFAULT_PARAMS["draw_margin"])

# Naive baseline: always predict the training-period frequencies of 1 / X / 2
base_rates = np.bincount(outcomes[train_mask], minlength=3) / train_mask.sum()
naive_error = float(np.mean(np.sum((base_rates - np.eye(3)[outcomes[test_mask]]) ** 2, axis=1)))

params = {key: best[key] for key in ("k", "home_adv", "draw_margin", "use_mov")}
with open(PARAMS_PATH, "w") as f:
    json.dump(params, f, indent=4)

print("Optimization completed!")
print(f"Optimal parameters: {params}")
print(f"Brier 1X2 (train):            {best['error']:.4f}")
print(f"Brier 1X2 (test, optimized):  {test_error:.4f}")
print(f"Brier 1X2 (test, defaults):   {default_error:.4f}")
print(f"Brier 1X2 (test, base rates): {naive_error:.4f}")
print(f"Parameters saved to {PARAMS_PATH}")
