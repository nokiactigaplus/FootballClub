/*
 * Real-world season data plus curated clubs and league classification.
 * This is not a census of every club or division worldwide.
 */
import { generatedClubs, generatedPlayers, generatedLeagues, generatedMetadata } from './database.generated.js';
import { fifaClubWorldCupClubs, fifaClubWorldCupLeagues, fifaClubWorldCupMetadata } from './fifa-club-world-cup.js';
import { englishLowerLeagueClubs, englishLowerLeagueCompetitions } from './english-lower-leagues.js';
import { liverpool2025Players } from './liverpool-2025-26.js';
import { getEuropeanDivision, europeanDivisionMetadata } from './european-divisions.js';
import { getEuropeanDivisionExtra } from './european-division-extras.js';

const slug = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const europeanTier = (country, competition) => getEuropeanDivision(country, competition) ?? getEuropeanDivisionExtra(country, competition);

const curatedLeagueRows = [
  ['Premier League', 'England'], ['La Liga', 'Spain'], ['Serie A', 'Italy'],
  ['Bundesliga', 'Germany'], ['Ligue 1', 'France'], ['Eredivisie', 'Netherlands'],
  ['Primeira Liga', 'Portugal'], ['Süper Lig', 'Turkey'], ['Russian Premier League', 'Russia'],
  ['Jupiler Pro League', 'Belgium'], ['League of Ireland', 'Ireland'], ['Scottish Premiership', 'Scotland'],
  ['J1 League', 'Japan'], ['K League 1', 'South Korea'], ['Chinese Super League', 'China'],
  ['Saudi Pro League', 'Saudi Arabia'], ['A-League Men', 'Australia'], ['Thai League 1', 'Thailand'],
  ['V.League 1', 'Vietnam'], ['Cambodian League', 'Cambodia'], ['Malaysia Super League', 'Malaysia'],
  ['Singapore Premier League', 'Singapore'], ['Philippines Football League', 'Philippines'], ['Liga 1', 'Indonesia'],
  ['Major League Soccer', 'United States'], ['Brasileirão Série A', 'Brazil'], ['Primera División', 'Argentina'],
  ['Premier Soccer League', 'South Africa'], ['Nigeria Premier League', 'Nigeria'],
  ['Ligue 1 Côte d’Ivoire', 'Ivory Coast'], ['Botola Pro', 'Morocco'], ['Egyptian Premier League', 'Egypt'],
].map(([name, country]) => ({ name, country, divisions: 1 }));

const leagueMap = new Map();
for (const league of [...curatedLeagueRows, ...generatedLeagues, ...fifaClubWorldCupLeagues, ...englishLowerLeagueCompetitions]) {
  const key = `${String(league.country || '').toLowerCase()}|${String(league.name || '').toLowerCase()}`;
  if (key === '|') continue;
  const division = league.division ?? europeanTier(league.country, league.name);
  leagueMap.set(key, {
    ...(leagueMap.get(key) || {}),
    ...league,
    ...(division ? { division, divisions: Math.max(Number(league.divisions) || 1, division) } : {}),
  });
}
export const leagues = [...leagueMap.values()];
export const allLeagues = leagues;

// Keep Liverpool selectable even when the generated season dataset is empty.
const curatedClubs = [{
  id: 'liverpool',
  name: 'Liverpool',
  country: 'England',
  continent: 'Europe',
  league: 'Premier League',
  division: 1,
  stadium: 'Anfield',
  capacity: 61276,
  primaryKit: '#c8102e',
  transferBudgetEUR: 0,
  dataSource: 'Curated club record; Liverpool FC 2025/26 squad source',
}];

const clubMap = new Map();
for (const club of [...generatedClubs, ...fifaClubWorldCupClubs, ...englishLowerLeagueClubs, ...curatedClubs]) {
  const id = club.id || slug(club.name);
  const previous = clubMap.get(id) || {};
  const division = club.division ?? europeanTier(club.country, club.league);
  clubMap.set(id, {
    ...previous,
    ...club,
    id,
    ...(division ? { division, divisionSource: club.divisionSource || 'European competition-name tier mapping' } : {}),
    fifaClubWorldCupEditions: [...new Set([...(previous.fifaClubWorldCupEditions || []), ...(club.fifaClubWorldCupEditions || [])])].sort((a, b) => a - b),
  });
}
export const clubs = [...clubMap.values()].sort((a, b) =>
  `${a.country || ''}|${a.league || ''}|${a.name || ''}`.localeCompare(`${b.country || ''}|${b.league || ''}|${b.name || ''}`),
);

// The current Liverpool 2025/26 roster replaces stale Liverpool season entries.
const playersWithoutLiverpool = generatedPlayers.filter((player) => player.club !== 'Liverpool');
export const players = [...playersWithoutLiverpool, ...liverpool2025Players];

export const dataStatus = {
  season: '2025/26 Liverpool roster; generated league dataset 2024/25',
  completeness: generatedPlayers.length
    ? 'generated season dataset plus curated Liverpool 2025/26 first-team roster, historic FIFA Club World Cup entrants, curated English EFL clubs, and European tier classification'
    : 'curated Liverpool 2025/26 first-team roster plus historic FIFA Club World Cup entrants, curated English EFL clubs, European competition tier mapping, and curated league list; run npm run database:build for generated season data',
  source: generatedMetadata.source || 'Liverpool FC official 2025/26 squad list and curated club records',
  generatedClubCount: generatedClubs.length,
  englishLowerLeagueClubCount: englishLowerLeagueClubs.length,
  englishLowerLeagueDivisions: 'EFL Championship, League One, League Two (2024/25)',
  europeanDivisionMaximum: europeanDivisionMetadata.maximumSelectableDivision,
  europeanDivisionCoverage: europeanDivisionMetadata.note,
  europeanClassifiedClubCount: clubs.filter((club) => europeanTier(club.country, club.league)).length,
  fifaClubWorldCupClubCount: fifaClubWorldCupClubs.length,
  fifaClubWorldCupEditions: fifaClubWorldCupMetadata.editions,
  liverpoolRosterCount: liverpool2025Players.length,
  coverageNote: `${generatedMetadata.coverageNote || ''} Liverpool roster is the 2025/26 first-team list; player ratings and values are gameplay estimates.`,
};

export const findClub = (name) => clubs.find((club) => String(club.name || '').toLowerCase() === String(name || '').toLowerCase());
export const clubForPlayer = (player) => findClub(player?.club);
export const formatEUR = (value) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0);
export const searchPlayers = ({ name = '', club = '', league = '' } = {}) => players.filter((player) =>
  String(player.name || '').toLowerCase().includes(name.toLowerCase())
  && String(player.club || '').toLowerCase().includes(club.toLowerCase())
  && (!league || clubForPlayer(player)?.league === league),
);
export const clubById = (id) => clubs.find((club) => club.id === id);
export const playerById = (id) => players.find((player) => player.id === id);
export const databaseSummary = {
  totalClubs: clubs.length,
  totalPlayers: players.length,
  totalLeagues: leagues.length,
  season: '2025/26 Liverpool squad; 2024/25 generated data',
  sampleMode: true,
  notes: 'Liverpool 2025/26 first-team names are sourced from the club squad announcement; ratings and values are gameplay estimates. Other generated data coverage varies.',
};

export default { clubs, players, leagues, allLeagues, dataStatus, findClub, clubForPlayer, formatEUR, searchPlayers, clubById, playerById, databaseSummary };
