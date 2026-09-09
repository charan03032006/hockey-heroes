import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from './App.jsx';
import Home from './pages/Home.jsx';
import Matches from './pages/Matches.jsx';
import MatchLive from './pages/MatchLive.jsx';
import Scorer from './pages/Scorer.jsx';
import Teams from './pages/Teams.jsx';
import TeamDetail from './pages/TeamDetail.jsx';
import PlayerDetail from './pages/PlayerDetail.jsx';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';
import TournamentManager from './pages/TournamentManager.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';

import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Home />} />
            <Route path="matches" element={<Matches />} />
            <Route path="matches/:id" element={<MatchLive />} />
            <Route path="teams" element={<Teams />} />
            <Route path="teams/:id" element={<TeamDetail />} />
            <Route path="players/:id" element={<PlayerDetail />} />
            <Route path="login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="matches/:id/score" element={<Scorer />} />
              <Route path="admin" element={<Admin />} />
              <Route path="tournaments" element={<TournamentManager />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
