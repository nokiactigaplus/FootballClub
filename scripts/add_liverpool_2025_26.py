#!/usr/bin/env python3
"""Merge Liverpool FC's published 2025/26 first-team roster into the generated player database.

Player names and shirt numbers are based on Liverpool FC's official 2025/26
squad-number announcement. Positions and gameplay attributes are categorized
or estimated for this game, not official ratings.
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATABASE = ROOT / 'database.generated.js'

# number, name, position, nationality, age, game rating, market value EUR
ROSTER = [
    (1, 'Alisson Becker', 'GK', 'Brazil', 32, 89, 25000000),
    (25, 'Giorgi Mamardashvili', 'GK', 'Georgia', 24, 84, 30000000),
    (28, 'Freddie Woodman', 'GK', 'England', 28, 72, 1000000),
    (41, 'Ármin Pécsi', 'GK', 'Hungary', 20, 66, 500000),
    (95, 'Harvey Davies', 'GK', 'England', 22, 65, 250000),
    (2, 'Joe Gomez', 'CB', 'England', 28, 80, 18000000),
    (4, 'Virgil van Dijk', 'CB', 'Netherlands', 34, 89, 25000000),
    (5, 'Ibrahima Konaté', 'CB', 'France', 26, 86, 50000000),
    (6, 'Milos Kerkez', 'LB', 'Hungary', 21, 82, 40000000),
    (12, 'Conor Bradley', 'RB', 'Northern Ireland', 22, 80, 25000000),
    (15, 'Giovanni Leoni', 'CB', 'Italy', 18, 74, 18000000),
    (26, 'Andy Robertson', 'LB', 'Scotland', 31, 83, 15000000),
    (30, 'Jeremie Frimpong', 'RB', 'Netherlands', 24, 85, 35000000),
    (46, 'Rhys Williams', 'CB', 'England', 24, 67, 500000),
    (47, 'Calvin Ramsay', 'RB', 'Scotland', 21, 68, 1000000),
    (3, 'Wataru Endo', 'CDM', 'Japan', 32, 79, 10000000),
    (7, 'Florian Wirtz', 'CAM', 'Germany', 22, 89, 140000000),
    (8, 'Dominik Szoboszlai', 'CM', 'Hungary', 24, 85, 70000000),
    (10, 'Alexis Mac Allister', 'CM', 'Argentina', 26, 87, 90000000),
    (17, 'Curtis Jones', 'CM', 'England', 24, 81, 30000000),
    (38, 'Ryan Gravenberch', 'CM', 'Netherlands', 23, 85, 75000000),
    (42, 'Trey Nyoni', 'CM', 'England', 18, 68, 3000000),
    (53, 'James McConnell', 'CDM', 'England', 20, 67, 1000000),
    (9, 'Alexander Isak', 'ST', 'Sweden', 26, 88, 120000000),
    (11, 'Mohamed Salah', 'RW', 'Egypt', 33, 90, 50000000),
    (14, 'Federico Chiesa', 'RW', 'Italy', 27, 80, 18000000),
    (18, 'Cody Gakpo', 'LW', 'Netherlands', 26, 85, 70000000),
    (22, 'Hugo Ekitike', 'ST', 'France', 23, 83, 75000000),
    (73, 'Rio Ngumoha', 'LW', 'England', 17, 67, 3000000),
    (76, 'Jayden Danns', 'ST', 'England', 19, 67, 2000000),
]


def slug(value: str) -> str:
    import unicodedata
    normalized = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', normalized))


def main() -> None:
    text = DATABASE.read_text(encoding='utf-8')
    match = re.search(r'^export const generatedPlayers = (.*);$', text, re.M)
    if not match:
        raise RuntimeError('Could not locate generatedPlayers JSON export')
    players = json.loads(match.group(1))

    # Replace all Liverpool rows to avoid stale 2024/25 players and duplicate names.
    players = [player for player in players if player.get('club') != 'Liverpool']
    for number, name, position, country, age, rating, market_value in ROSTER:
        players.append({
            'id': f"liverpool-2025-26-{slug(name)}",
            'name': name,
            'age': age,
            'position': position,
            'club': 'Liverpool',
            'country': country,
            'ovr': rating,
            'potential': max(rating, min(95, rating + (4 if age <= 23 else 1))),
            'marketValueEUR': market_value,
            'weeklyWageEUR': 0,
            'wonderkid': age <= 21 and rating >= 67,
            'sourceId': f'liverpool-2025-26-{slug(name)}',
            'league': 'Premier League',
            'appearances2024_25': 0,
            'season': '2025/26',
            'shirtNumber': number,
            'rosterOnly': True,
            'dataSource': 'Liverpool FC official 2025/26 squad-number announcement; position and gameplay attributes curated estimates',
        })

    players.sort(key=lambda player: (player.get('league') or '', player.get('club') or '', player.get('name') or '', player.get('id') or ''))
    replacement = 'export const generatedPlayers = ' + json.dumps(players, ensure_ascii=False, separators=(',', ':')) + ';'
    text = text[:match.start()] + replacement + text[match.end():]
    DATABASE.write_text(text, encoding='utf-8')
    print(f'Added {len(ROSTER)} Liverpool 2025/26 first-team players; total player records: {len(players)}.')


if __name__ == '__main__':
    main()
