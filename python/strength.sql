SELECT 
    Team,
    SUM(HomeGames + AwayGames) as TotalGames,
    SUM(HomeGoalsScored + AwayGoalsScored) as TotalGoalsScored,
    CAST(SUM(HomeGoalsScored + AwayGoalsScored) AS FLOAT) / SUM(HomeGames + AwayGames) as AvgScored,
    CAST(SUM(HomeGoalsConceded + AwayGoalsConceded) AS FLOAT) / SUM(HomeGames + AwayGames) as AvgConceded
FROM (
    SELECT HomeTeam as Team, 1 as HomeGames, 0 as AwayGames, FTHG as HomeGoalsScored, FTAG as HomeGoalsConceded, 0 as AwayGoalsScored, 0 as AwayGoalsConceded FROM matches
    UNION ALL
    SELECT AwayTeam as Team, 0 as HomeGames, 1 as AwayGames, 0 as HomeGoalsScored, 0 as HomeGoalsConceded, FTAG as AwayGoalsScored, FTHG as AwayGoalsConceded FROM matches
)
GROUP BY Team;