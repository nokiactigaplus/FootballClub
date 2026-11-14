import React, { useEffect, useMemo, useRef, useState } from 'react';
import { clubs, players } from '../database.js';
import { fifaClubWorldCupClubs } from '../fifa-club-world-cup.js';

const SAVE_KEY = 'football-club-manager-save';
const slug = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (items) => items[Math.floor(Math.random() * items.length)];

function readSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch { return {}; }
}
function minuteLabel(minute) { return `${minute}'`; }

function makeRoster(clubName, save, allClubs) {
  const clubPlayers = players.filter((player) => player.club === clubName);
  if (clubPlayers.length) {
    if (clubName === save.club && Array.isArray(save.squad) && save.squad.length) {
      const squadPlayers = save.squad.map((id) => players.find((player) => player.id === id)).filter(Boolean);
      if (squadPlayers.length) return squadPlayers;
    }
    return clubPlayers;
  }
  return Array.from({ length: 18 }, (_, index) => ({
    id: `${slug(clubName)}-match-player-${index + 1}`,
    name: `${clubName} ${['GK', 'DEF', 'MID', 'ATT'][index % 4]} ${index + 1}`,
    position: ['GK', 'CB', 'CM', 'ST'][index % 4],
    ovr: 60,
  }));
}

function goalNarrative(scorer, assister) {
  if (Math.random() < 0.18) {
    return 'Serangan balik cepat dimulai setelah sepak pojok. Thom Cleverley mengirim umpan ke Rooney, Rooney memberi umpan terobosan yang lolos melewati Puyol dan Xavi, lalu Van Persie menyambut umpan itu dengan tendangan melengkung ke sudut atas gawang Valdés.';
  }

  const assisterName = assister?.name;
  const scenarios = [
    () => `${scorer.name} mengambil tendangan bebas dan mengirim bola melengkung melewati pagar hidup ke sudut gawang.`,
    () => assisterName
      ? `${assisterName} mengirim umpan silang ke kotak penalti, lalu ${scorer.name} memenangi duel udara dan menanduk bola ke gawang.`
      : `${scorer.name} menyambut bola di kotak penalti dengan sundulan tajam yang tak mampu dijangkau kiper.`,
    () => assisterName
      ? `${assisterName} mengirim umpan terobosan. ${scorer.name} berlari ke ruang kosong, melewati tekanan bek, lalu menaklukkan kiper dalam situasi satu lawan satu.`
      : `${scorer.name} merebut bola di depan kotak penalti, menggiringnya melewati penjagaan, lalu menuntaskan peluang dengan tenang.`,
    () => assisterName
      ? `Serangan balik cepat dimulai dari ${assisterName}, yang melepas umpan ke depan. ${scorer.name} menyelesaikannya dengan tembakan mendatar ke tiang jauh.`
      : `Setelah sepak pojok lawan gagal, ${scorer.name} memimpin serangan balik dan mengakhirinya dengan sepakan akurat.`,
    () => assisterName
      ? `${assisterName} mengirim bola ke area berbahaya. ${scorer.name} menyambutnya dengan tendangan voli keras sebelum bola menyentuh tanah.`
      : `${scorer.name} menyambar bola liar dengan tendangan voli keras yang bersarang di gawang.`,
    () => assisterName
      ? `${assisterName} mengirim umpan tarik dari sisi lapangan. ${scorer.name} datang dari lini kedua dan melepaskan tembakan first-time ke gawang.`
      : `${scorer.name} menemukan ruang di depan kotak penalti dan melepaskan tembakan first-time yang mengarah ke sudut gawang.`,
    () => `${scorer.name} mencoba tembakan jarak jauh; bola meluncur deras dan berbelok tipis, mengecoh kiper sebelum masuk ke gawang.`,
    () => `${scorer.name} menyambar bola muntah setelah kiper menepis tembakan pertama, lalu menceploskannya dari jarak dekat.`,
    () => assisterName
      ? `${assisterName} mengirim umpan pendek di tepi kotak penalti. ${scorer.name} membuka ruang dengan satu sentuhan lalu melengkungkan bola ke pojok gawang.`
      : `${scorer.name} mengontrol bola di tepi kotak penalti dan melepaskan tendangan melengkung ke pojok atas gawang.`,
  ];
  return pick(scenarios)();
}

function buildMatchReport(homeName, awayName, homeGoals, awayGoals, save, allClubs) {
  const homeRoster = makeRoster(homeName, save, allClubs);
  const awayRoster = makeRoster(awayName, save, allClubs);
  const events = [];
  const addGoalEvents = (scoringRoster, defendingRoster, count, teamName) => {
    for (let index = 0; index < count; index += 1) {
      const outfieldPlayers = scoringRoster.filter((player) => player.position !== 'GK');
      const scorer = pick(outfieldPlayers.length ? outfieldPlayers : scoringRoster);
      const ownGoal = Math.random() < 0.06;
      const possibleAssisters = scoringRoster.filter((player) => player.id !== scorer.id && player.position !== 'GK');
      const assister = !ownGoal && possibleAssisters.length && Math.random() < 0.78 ? pick(possibleAssisters) : null;
      const player = ownGoal ? pick(defendingRoster) : scorer;
      events.push({
        type: ownGoal ? 'ownGoal' : 'goal',
        minute: randomInt(2, 90),
        player,
        assist: assister,
        narrative: ownGoal ? `${player.name} salah mengantisipasi bola dan tanpa sengaja mengarahkannya ke gawang sendiri.` : goalNarrative(scorer, assister),
        team: teamName,
      });
    }
  };
  addGoalEvents(homeRoster, awayRoster, homeGoals, homeName);
  addGoalEvents(awayRoster, homeRoster, awayGoals, awayName);

  const cards = [];
  for (const [name, roster] of [[homeName, homeRoster], [awayName, awayRoster]]) {
    for (let i = 0, count = randomInt(0, 3); i < count; i += 1) cards.push({ type: 'yellow', minute: randomInt(12, 88), player: pick(roster), team: name });
    if (Math.random() < 0.08) cards.push({ type: 'red', minute: randomInt(25, 88), player: pick(roster), team: name });
  }
  const substitutions = [];
  for (const [name, roster] of [[homeName, homeRoster], [awayName, awayRoster]]) {
    for (let index = 0, count = randomInt(3, 5); index < count; index += 1) {
      const outgoing = pick(roster);
      const alternatives = roster.filter((player) => player.id !== outgoing.id);
      substitutions.push({ type: 'sub', minute: randomInt(46, 88), player: pick(alternatives.length ? alternatives : roster), replaced: outgoing, team: name });
    }
  }
  events.push(...cards, ...substitutions);
  events.sort((a, b) => a.minute - b.minute);

  const homeStrength = homeRoster.reduce((sum, player) => sum + (Number(player.ovr) || 60), 0) / Math.max(1, homeRoster.length);
  const awayStrength = awayRoster.reduce((sum, player) => sum + (Number(player.ovr) || 60), 0) / Math.max(1, awayRoster.length);
  const strengthDiff = Math.max(-12, Math.min(12, (homeStrength - awayStrength) / 3));
  const homePossession = Math.max(32, Math.min(68, randomInt(43, 57) + Math.round(strengthDiff)));
  const homeShots = Math.max(homeGoals, randomInt(7, 18));
  const awayShots = Math.max(awayGoals, randomInt(6, 16));
  const homeOnTarget = Math.min(homeShots, Math.max(homeGoals, randomInt(Math.max(2, homeGoals), Math.max(4, homeGoals + 5))));
  const awayOnTarget = Math.min(awayShots, Math.max(awayGoals, randomInt(Math.max(2, awayGoals), Math.max(4, awayGoals + 5))));
  const homeCards = cards.filter((card) => card.team === homeName);
  const awayCards = cards.filter((card) => card.team === awayName);
  return {
    homeName, awayName, homeGoals, awayGoals, events,
    stats: [
      { label: 'Penguasaan bola', home: homePossession, away: 100 - homePossession, suffix: '%' },
      { label: 'Tembakan', home: homeShots, away: awayShots },
      { label: 'Tepat sasaran', home: homeOnTarget, away: awayOnTarget },
      { label: 'Akurasi operan', home: randomInt(74, 92), away: randomInt(72, 90), suffix: '%' },
      { label: 'Total operan', home: randomInt(280, 620), away: randomInt(260, 600) },
      { label: 'Pelanggaran', home: randomInt(5, 17), away: randomInt(6, 19) },
      { label: 'Tendangan sudut', home: randomInt(1, 10), away: randomInt(1, 9) },
      { label: 'Offside', home: randomInt(0, 4), away: randomInt(0, 4) },
      { label: 'Penyelamatan kiper', home: Math.max(0, awayOnTarget - awayGoals), away: Math.max(0, homeOnTarget - homeGoals) },
      { label: 'Kartu kuning', home: homeCards.filter((card) => card.type === 'yellow').length, away: awayCards.filter((card) => card.type === 'yellow').length },
      { label: 'Kartu merah', home: homeCards.filter((card) => card.type === 'red').length, away: awayCards.filter((card) => card.type === 'red').length },
    ],
  };
}

function eventDescription(event) {
  if (event.type === 'goal') return <><b>{event.player.name}</b> mencetak gol. <span className="text-white/60">{event.narrative}</span></>;
  if (event.type === 'ownGoal') return <><b>{event.player.name}</b> mencetak gol bunuh diri. <span className="text-white/60">{event.narrative}</span></>;
  if (event.type === 'yellow') return <><b>{event.player.name}</b> mendapat kartu kuning.</>;
  if (event.type === 'red') return <><b>{event.player.name}</b> mendapat kartu merah.</>;
  return <><b>{event.player.name}</b> masuk menggantikan {event.replaced.name}.</>;
}

export default function MatchStatsOverlay() {
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('Ringkasan');
  const requestId = useRef(0);
  const allClubs = useMemo(() => [...new Map([...clubs, ...fifaClubWorldCupClubs].map((club) => [club.id || slug(club.name), club])).values()], []);

  useEffect(() => {
    const inspectResult = () => {
      if (!requestId.current) return;
      const resultLayer = [...document.querySelectorAll('div.fixed.inset-0')].find((element) => element.textContent?.includes('Hasil pertandingan'));
      if (!resultLayer) return;
      const headingText = resultLayer.querySelector('h2')?.textContent?.trim() || '';
      const score = headingText.match(/(\d+)\s*[–—-]\s*(\d+)/);
      if (!score) return;
      const save = readSave();
      const homeName = save.club || '';
      const awayName = allClubs.filter((club) => club.name !== homeName).sort((a, b) => b.name.length - a.name.length).find((club) => headingText.includes(club.name))?.name || 'Lawan';
      const key = requestId.current;
      const result = buildMatchReport(homeName, awayName, Number(score[1]), Number(score[2]), save, allClubs);
      setReport({ ...result, requestId: key });
      setActiveTab('Ringkasan');
      requestId.current = 0;
    };
    const onClickCapture = (event) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (!button?.textContent?.includes('Mainkan pertandingan')) return;
      requestId.current += 1;
      window.setTimeout(inspectResult, 80);
    };
    const observer = new MutationObserver(inspectResult);
    document.addEventListener('click', onClickCapture, true);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      document.removeEventListener('click', onClickCapture, true);
      observer.disconnect();
    };
  }, [allClubs]);

  if (!report) return null;
  const outcome = report.homeGoals > report.awayGoals ? 'MENANG' : report.homeGoals < report.awayGoals ? 'KALAH' : 'SERI';
  const outcomeStyle = outcome === 'MENANG' ? 'text-lime-200' : outcome === 'KALAH' ? 'text-rose-200' : 'text-amber-100';
  const tabs = ['Ringkasan', 'Statistik', 'Kronologi'];
  const goalEvents = report.events.filter((event) => event.type === 'goal' || event.type === 'ownGoal');

  return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label="Statistik hasil pertandingan">
    <section className="w-full max-w-xl overflow-hidden rounded-[24px] border border-white/10 bg-[#0d131c] text-white shadow-2xl shadow-black/60">
      <header className="border-b border-white/10 bg-gradient-to-br from-lime-300/[.12] via-[#111a23] to-cyan-300/[.07] px-4 pb-4 pt-5 sm:px-6">
        <button type="button" aria-label="Tutup statistik" onClick={() => setReport(null)} className="float-right rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs text-white/70">Tutup</button>
        <p className="text-[9px] font-bold uppercase tracking-[.24em] text-lime-200">Laporan pertandingan · 90 menit</p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <p className="truncate text-right text-xs font-bold sm:text-sm">{report.homeName}</p>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-3xl font-black tabular-nums sm:px-5 sm:text-4xl">{report.homeGoals}<span className="mx-1 text-white/25">:</span>{report.awayGoals}</div>
          <p className="truncate text-left text-xs font-bold sm:text-sm">{report.awayName}</p>
        </div>
        <p className={`mt-3 text-center text-[10px] font-black tracking-[.2em] ${outcomeStyle}`}>{outcome}</p>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-white/[.06] bg-black/20 p-2 text-center">
          {goalEvents.length ? goalEvents.slice(0, 3).map((event, index) => <div key={`${event.minute}-${index}`} className="text-[9px] text-white/65"><span className="font-bold text-lime-200">{minuteLabel(event.minute)}</span> {event.player.name}</div>) : <div className="col-span-3 text-[9px] text-white/40">Belum ada gol dalam pertandingan.</div>}
        </div>
      </header>
      <div className="flex gap-1 border-b border-white/10 px-3 pt-2" role="tablist" aria-label="Detail pertandingan">
        {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`flex-1 rounded-t-xl px-2 py-2.5 text-[10px] font-bold uppercase tracking-[.18em] ${activeTab === tab ? 'bg-white/[.06] text-white' : 'text-white/45 hover:text-white/75'}`}>{tab}</button>)}
      </div>
      <div className="max-h-[min(48vh,390px)] overflow-y-auto p-3 sm:p-4">
        {activeTab === 'Ringkasan' && <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">{report.stats.slice(0, 4).map((stat) => <div key={stat.label} className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><p className="text-[9px] uppercase tracking-[.16em] text-white/45">{stat.label}</p><div className="mt-2 flex items-end justify-between gap-2"><span className="text-lg font-black text-white">{stat.home}</span><span className="text-[9px] text-white/35">{stat.suffix || ''}</span><span className="text-lg font-black text-white/70">{stat.away}</span></div></div>)}</div>
          <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><h3 className="text-[10px] font-bold uppercase tracking-wider text-white/55">Sorotan</h3><div className="mt-2 space-y-2">{report.events.filter((event) => event.type === 'goal' || event.type === 'ownGoal' || event.type === 'red').slice(0, 5).map((event, index) => <div key={`${event.minute}-${index}`} className="flex items-start gap-2 text-[10px]"><span className="w-8 shrink-0 font-bold text-lime-200">{minuteLabel(event.minute)}</span><span className="text-white/65">{eventDescription(event)} <span className="text-white/35">({event.team})</span></span></div>)}{!report.events.some((event) => event.type === 'goal' || event.type === 'ownGoal' || event.type === 'red') && <p className="text-[10px] text-white/40">Pertandingan berjalan tanpa gol atau kartu merah.</p>}</div></div>
        </div>}
        {activeTab === 'Statistik' && <div className="space-y-1.5">{report.stats.map((stat) => {
          const total = Math.max(1, stat.home + stat.away);
          const homeWidth = stat.suffix === '%' ? stat.home : (stat.home / total) * 100;
          return <div key={stat.label} className="rounded-xl border border-white/[.05] bg-white/[.02] px-3 py-2.5"><div className="grid grid-cols-[36px_1fr_36px] items-center gap-2 text-[10px] font-bold text-white/55"><span>{stat.label}</span><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-lime-300" style={{ width: `${Math.min(100, (homeWidth / total) * 100)}%` }} /></div><span>{stat.home}</span></div></div>;
        })}</div>}
        {activeTab === 'Kronologi' && <div className="relative ml-3 border-l border-white/10 pl-5">{report.events.map((event, index) => <div key={`${event.minute}-${event.type}-${event.player.id}-${index}`} className="relative flex gap-3 border-b border-white/[.04] py-3 last:border-0"><span className={`absolute -left-[25px] top-4 h-2.5 w-2.5 rounded-full border-2 border-[#0d131c] ${event.type === 'goal' || event.type === 'ownGoal' ? 'bg-lime-300' : event.type === 'red' ? 'bg-rose-400' : event.type === 'yellow' ? 'bg-amber-300' : 'bg-cyan-300'}`} /><span className="w-8 shrink-0 text-[10px] font-bold tabular-nums text-white/45">{minuteLabel(event.minute)}</span><p className="text-[10px] leading-relaxed text-white/70">{eventDescription(event)} <span className="text-white/35">· {event.team}</span></p></div>)}</div>}
      </div>
      <footer className="border-t border-white/10 px-4 py-3 text-[9px] leading-relaxed text-white/35 sm:px-5">Kronologi dan statistik merupakan narasi simulasi untuk pertandingan ini.</footer>
    </section>
  </div>;
}
