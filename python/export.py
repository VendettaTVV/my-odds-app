import sqlite3
import pandas as pd
import json
import os

# 1. Загружаем все матчи
con = sqlite3.connect('football.db')
df = pd.read_sql_query("SELECT Date, HomeTeam, AwayTeam, FTHG, FTAG FROM matches", con)
con.close()

# 2. Правильно парсим даты и сортируем от самых свежих к старым
df["Date"] = pd.to_datetime(df["Date"], format='mixed', dayfirst=True)
df = df.sort_values("Date", ascending=False)

teams_data = {}
all_teams = pd.concat([df['HomeTeam'], df['AwayTeam']]).unique()

# 3. Считаем статистику строго по последним 38 играм каждой команды
for team in all_teams:
    team_matches = df[(df['HomeTeam'] == team) | (df['AwayTeam'] == team)].head(38)
    
    if len(team_matches) == 0:
        continue
        
    scored = 0
    conceded = 0
    
    for _, m in team_matches.iterrows():
        if m['HomeTeam'] == team:
            scored += m['FTHG']
            conceded += m['FTAG']
        else:
            scored += m['FTAG']
            conceded += m['FTHG']
            
    # Среднее количество забитых/пропущенных за матч (эквивалент базового xG)
    teams_data[team] = {
        "attack_xg": round(scored / len(team_matches), 2),
        "defense_xg": round(conceded / len(team_matches), 2)
    }

# 4. Сохраняем для React-дашборда
os.makedirs('../public/data', exist_ok=True)
with open('../public/data/teams.json', 'w', encoding='utf-8') as f:
    json.dump(teams_data, f, indent=4)

print(f"Готово! Динамические xG по последним 38 матчам сохранены.")