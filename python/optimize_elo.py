import pandas as pd
import sqlite3

con = sqlite3.connect("football.db")
df = pd.read_sql("SELECT Date, HomeTeam, AwayTeam, FTHG, FTAG FROM matches", con)
df["Date"] = pd.to_datetime(df["Date"], format='mixed', dayfirst=True)
df = df.sort_values("Date")

best_k = 20
best_home = 100
lowest_error = float('inf')

print("Запуск перебора параметров (это займет пару секунд)...")

# Перебираем K от 10 до 50
for K in range(10, 52, 2):
    # Перебираем Домашнее преимущество от 20 до 120
    for HOME in range(20, 130, 10):
        ratings = {}
        error = 0
        matches_counted = 0

        for _, m in df.iterrows():
            rh = ratings.get(m.HomeTeam, 1500)
            ra = ratings.get(m.AwayTeam, 1500)

            # Вычисляем ожидаемую вероятность победы хозяев
            expected_home = 1 / (1 + 10 ** ((ra - (rh + HOME)) / 400))
            
            # Фактический результат (1 - победа, 0.5 - ничья, 0 - поражение)
            if m.FTHG > m.FTAG: actual_home = 1
            elif m.FTHG == m.FTAG: actual_home = 0.5
            else: actual_home = 0

            # Считаем ошибку предсказания (Brier Score)
            # Пропускаем первый сезон (380 матчей), чтобы дать рейтингам "разогреться"
            if matches_counted > 380:
                error += (expected_home - actual_home) ** 2

            # Обновляем рейтинги
            change = K * (actual_home - expected_home)
            ratings[m.HomeTeam] = rh + change
            ratings[m.AwayTeam] = ra - change
            
            matches_counted += 1

        # Если ошибка меньше предыдущей, запоминаем эти параметры
        if error < lowest_error:
            lowest_error = error
            best_k = K
            best_home = HOME

print(f"Оптимизация завершена!")
print(f"Идеальный K-фактор для АПЛ: {best_k}")
print(f"Идеальное домашнее преимущество: {best_home}")