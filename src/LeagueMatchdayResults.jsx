import React, { useEffect, useMemo, useState } from 'react';
import { clubs, players } from '../database.js';
import { fifaClubWorldCupClubs } from '../fifa-club-world-cup.js';
import { getLeagueRoundFixtures, readGameSave } from './leagueSchedule.js';

const RESULTS_KEY = 'football-club-manager-matchday-results';
const slug = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const hash = (value) => [...String(value)].reduce((result, char) => (Math.imul(result, 31) + char.charCodeAt(0)) >>> 0, 7);
const readResults = () => { try { return JSON.parse(localStorage.getItem(RESULTS_KEY) || '{}'); } catch { return {}; } };
const matchdayKey = (save, round) => `${save.club || ''}|${save.week ? Math.max(1, Number(round) || 1) : round}|${save.club || ''}`;

function simulatedScore(fixture, round, homeRating, awayRating) {
  const seed = hash(`${fixture.home.name}-${fixture.away.name}-${round}`);
  const homeEdge = Math.max(-2, Math.min(2, Math.round((homeRating - awayRating) / 18)));
  const homeGoals = Math.max(0, Math.min(5, (seed % 4) + (homeEdge > 0 && seed % 3 === 0 ? 1 : 0)));
  const awayGoals = Math.max(0, Math.min(5, ((seed >>> 4) % 4) + (homeEdge < 0 && seed % 3 === 0 ? 1 : 0)));
  return { homeGoals, awayGoals };
}

export default function LeagueMatchdayResults() {
  const [save, setSave] = useState(readGameSave);
  const [results, setResults] = useState(readResults);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const allClubs = useMemo(() => [...new Map([...clubs, ...fifaClubWorldCupClubs].map((club) => [club.id || slug(club.name), club])).values()], []);
  const playedRound = Math.max(1, (Number(save.week) || 1) - (Number(save.played) > 0 ? 1 : 0));
  const fixtures = useMemo(() => getLeagueRoundFixtures(save, playedRound), [save, playedRound]);
  const currentClub = allClubs.find((club) => club.name === save.club);
  const dayKey = matchdayKey(save, playedRound);

  useEffect(() => {
    const refresh = () => {
      setSave(readGameSave());
      setResults(readResults());
    };
    const onMatchStart = (event) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (button?.textContent?.includes('Mainkan pertandingan')) setNotice('');
    };
    const inspectMatchResult = () => {
      const layer = [...document.querySelectorAll('div.fixed.inset-0')].find((element) => element.textContent?.includes('Hasil pertandingan'));
      if (!layer) return;
      const heading = layer.querySelector('h2')?.textContent?.trim() || '';
      const score = heading.match(/(\d+)\s*[–—-]\s*(\d+)/);
      if (!score) return;
      const latestSave = readGameSave();
      const round = Math.max(1, (Number(latestSave.week) || 1) - (Number(latestSave.played) > 0 ? 1 : 0));
      const roundFixtures = getLeagueRoundFixtures(latestSave, round);
      const matched = roundFixtures.find((fixture) => heading.includes(fixture.home.name) && heading.includes(fixture.away.name));
      if (!matched) return;
      const userGoals = Number(score[1]);
      const opponentGoals = Number(score[2]);
      const userIsHome = matched.home.name === latestSave.club;
      const entry = { homeGoals: userIsHome ? userGoals : opponentGoals, awayGoals: userIsHome ? opponentGoals : userGoals, actual: true };
      const key = `${latestSave.club || ''}|${round}|${latestSave.club || ''}`;
      const stored = readResults();
      if (stored[key]?.[`${matched.home.name}|${matched.away.name}`]?.actual) return;
      stored[key] = { ...(stored[key] || {}), [`${matched.home.name}|${matched.away.name}`]: entry };
      try { localStorage.setItem(RESULTS_KEY, JSON.stringify(stored)); } catch { /* local storage unavailable */ }
      setResults(stored);
      setNotice('Skor laga Anda tercatat. Hasil pertandingan klub lain di matchday ini adalah simulasi.');
    };
    const observer = new MutationObserver(inspectMatchResult);
    document.addEventListener('click', onMatchStart, true);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 1200);
    return () => {
      document.removeEventListener('click', onMatchStart, true);
      observer.disconnect();
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, []);

  if (!save?.clubChosen || !currentClub || !fixtures.length) return null;
  const savedMatchday = results[dayKey] || {};
  const rows = fixtures.map((fixture) => {
    const key = `${fixture.home.name}|${fixture.away.name}`;
    const actual = savedMatchday[key];
    const homePlayers = players.filter((player) => player.club === fixture.home.name);
    const awayPlayers = players.filter((player) => player.club === fixture.away.name);
    const rating = (roster) => roster.length ? roster.reduce((sum, player) => sum + (Number(player.ovr) || 60), 0) / roster.length : 60;
    const score = actual || simulatedScore(fixture, playedRound, rating(homePlayers), rating(awayPlayers));
    return { fixture, score, actual: Boolean(actual?.actual) };
  });

  return <>
    <button type="button" onClick={() => { setSave(readGameSave()); setResults(readResults()); setOpen(true); }} className="fixed bottom-[5.25rem] right-4 z-40 rounded-full border border-cyan-200/25 bg-[#111b24] px-3 py-2.5 text-xs font-bold text-cyan-100 shadow-lg shadow-black/30 hover:bg-cyan-200 hover:text-[#081114] sm:right-7">Hasil matchday</button>
    {open && <div className="fixed inset-0 z-[75] grid place-items-center bg-black/75 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="Hasil pertandingan liga hari ini" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d131c] text-white shadow-2xl shadow-black/60">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 bg-gradient-to-br from-cyan-300/[.12] via-[#111a23] to-lime-300/[.07] p-5"><div><p className="text-[10px] font-bold uppercase tracking-widest text-cyan-200">Matchday liga</p><h2 className="mt-1 text-xl font-black">Hasil pertandingan · Pekan {playedRound}</h2><p className="mt-1 text-xs text-white/50">{currentClub.league} · {currentClub.country}</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70">Tutup</button></header>
        <div className="max-h-[65vh] space-y-2 overflow-y-auto p-4 sm:p-5">{rows.map(({ fixture, score, actual }) => <article key={`${fixture.home.name}-${fixture.away.name}`} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border px-3 py-3 ${fixture.home.name === save.club || fixture.away.name === save.club ? 'border-lime-300/20 bg-lime-300/[.04]' : 'border-white/[.06] bg-white/[.02]'}`}><div className="truncate text-right text-xs font-semibold">{fixture.home.name}</div><div className="rounded-lg bg-black/25 px-3 py-1.5 text-sm font-black tabular-nums">{score.homeGoals}–{score.awayGoals}</div><div className="truncate text-xs font-semibold">{fixture.away.name}</div><p className="col-span-3 text-center text-[9px] text-white/35">{actual ? 'Hasil pertandingan Anda' : 'Hasil simulasi matchday'}</p></article>)}</div>
        {notice && <p className="border-t border-white/[.06] px-4 py-3 text-[10px] text-cyan-100/70">{notice}</p>}
        <footer className="border-t border-white/10 px-4 py-3 text-[9px] text-white/35">Skor pertandingan lain disimulasikan deterministik untuk matchday ini; skor pertandingan Anda diambil dari hasil laga yang dimainkan.</footer>
      </section>
    </div>}
  </>;
}
