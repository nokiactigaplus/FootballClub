import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import MatchStatsOverlay from './MatchStatsOverlay.jsx';
import MyClubMenu from './MyClubMenu.jsx';
import EntertainmentMenu from './EntertainmentMenu.jsx';
import LeagueStatsMenu from './LeagueStatsMenu.jsx';
import LeagueMatchdayResults from './LeagueMatchdayResults.jsx';
import FinanceMenu from './FinanceMenu.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <>
      <App />
      <LeagueStatsMenu />
      <MyClubMenu />
      <EntertainmentMenu />
      <LeagueMatchdayResults />
      <FinanceMenu />
      <MatchStatsOverlay />
    </>
  </React.StrictMode>,
);
