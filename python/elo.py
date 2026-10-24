import sqlite3
import pandas as pd
import json
import os

con = sqlite3.connect("football.db")
df = pd.read_sql("SELECT Date, HomeTeam, AwayTeam, FTHG, FTAG FROM matches", con)
# Указываем формат даты, чтобы избежать ошибок сортировки
df["Date"] = pd.to_datetime(df["Date"], format='mixed', dayfirst=True)
df = df.sort_values("Date")

ratings = {}
K = 28          # Коэффициент чувствительности
HOME = 40      # Домашнее преимущество (из вашего README)

for _, m in df.iterrows():
    rh = ratings.get(m.HomeTeam, 1500)
    ra = ratings.get(m.AwayTeam, 1500)
    
    # Ожидаемый результат для хозяев
    expected = 1 / (1 + 10 ** ((ra - (rh + HOME)) / 400))
    
    if m.FTHG > m.FTAG: actual = 1
    elif m.FTHG == m.FTAG: actual = 0.5
    else: actual = 0
    
    change = K * (actual - expected)
    ratings[m.HomeTeam] = rh + change
    ratings[m.AwayTeam] = ra - change

# Сохраняем в React
os.makedirs('../public/data', exist_ok=True)
with open("../public/data/elo.json", "w") as f:
    json.dump({t: round(r) for t, r in ratings.items()}, f, indent=4)

# Выводим Топ-10 для проверки
print("Top 10 ELO Ratings:")
for team, r in sorted(ratings.items(), key=lambda x: -x[1])[:10]:
    print(f"{team:20} {r:.0f}")
print("\nELO данные сохранены в public/data/elo.json")