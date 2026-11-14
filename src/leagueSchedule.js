import { clubs } from '../database.js';
import { fifaClubWorldCupClubs } from '../fifa-club-world-cup.js';

const slug = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function readGameSave() {
  try { return JSON.parse(localStorage.getItem('football-club-manager-save') || '{}'); } catch { return {}; }
}

export function buildDoubleRoundRobin(leagueClubs) {
  const teams = [...new Map(leagueClubs.map((club) => [club.id || slug(club.name), club])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  if (teams.length < 2) return [];
  const rotation = [...teams];
  if (rotation.length % 2) rotation.push(null);
  const roundsPerLeg = rotation.length - 1;
  const firstLeg = [];

  for (let round = 0; round < roundsPerLeg; round += 1) {
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[rotation.length - 1 - index];
      if (!left || !right) continue;
      const swapVenue = (round + index) % 2 === 1;
      firstLeg.push({ round: round + 1, home: swapVenue ? right : left, away: swapVenue ? left : right });
    }
    rotation.splice(1, 0, rotation.pop());
  }
  return [...firstLeg, ...firstLeg.map((fixture) => ({
    round: fixture.round + roundsPerLeg,
    home: fixture.away,
    away: fixture.home,
  }))];
}

function getLeagueContext(save) {
  if (!save?.clubChosen || !save.club) return { club: null, leagueClubs: [], allFixtures: [] };
  const allClubs = [...new Map([...clubs, ...fifaClubWorldCupClubs].map((club) => [club.id || slug(club.name), club])).values()];
  const club = allClubs.find((item) => item.name === save.club);
  if (!club?.league) return { club, leagueClubs: [], allFixtures: [] };
  const leagueClubs = allClubs.filter((item) => item.league === club.league && item.country === club.country);
  if (!leagueClubs.some((item) => item.name === club.name)) leagueClubs.push(club);
  return { club, leagueClubs, allFixtures: buildDoubleRoundRobin(leagueClubs) };
}

export function getClubLeagueSchedule(save = readGameSave()) {
  const { club, allFixtures } = getLeagueContext(save);
  const fixtures = allFixtures.filter((item) => item.home.name === club?.name || item.away.name === club?.name);
  return { club, fixtures, currentIndex: Math.max(0, Number(save?.week || 1) - 1) };
}

export function getLeagueRoundFixtures(save = readGameSave(), round = 1) {
  const { allFixtures } = getLeagueContext(save);
  return allFixtures.filter((fixture) => fixture.round === Number(round));
}

function shiftDate(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
}

export function getLeagueCalendarEvents(save = readGameSave(), today = new Date()) {
  const { club, fixtures, currentIndex } = getClubLeagueSchedule(save);
  if (!club || !fixtures.length) return [];
  return fixtures.map((fixture, index) => {
    const date = shiftDate(today, (index - currentIndex) * 7);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isHome = fixture.home.name === club.name;
    const opponent = isHome ? fixture.away.name : fixture.home.name;
    return {
      id: `league-${club.id || slug(club.name)}-${fixture.round}`,
      date: dateKey,
      title: `${fixture.home.name} vs ${fixture.away.name}`,
      category: 'Jadwal Liga',
      detail: `Putaran ${fixture.round} · ${isHome ? 'Kandang' : 'Tandang'} untuk ${club.name} · Lawan: ${opponent}`,
      round: fixture.round,
      home: fixture.home.name,
      away: fixture.away.name,
      venue: isHome ? 'Kandang' : 'Tandang',
    };
  });
}
