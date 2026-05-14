import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import { Sun, Moon, LayoutList, PlusCircle } from 'lucide-react';
import CampaignList from './pages/CampaignList';
import CreateCampaign from './pages/CreateCampaign';

function Sidebar() {
  const { isDark, toggleTheme } = useTheme();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-accent/10 text-accent'
        : 'text-muted hover:text-main hover:bg-border/40'
    }`;

  return (
    <aside className="w-52 shrink-0 bg-surface border-r border-border flex flex-col py-6 px-3">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 6.5L5 9.5L11 3.5" stroke="#0f0d12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-semibold text-sm tracking-tight">CampaignOS</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        <NavLink to="/" end className={linkClass}>
          <LayoutList size={16} /> Campaigns
        </NavLink>
        <NavLink to="/create" className={linkClass}>
          <PlusCircle size={16} /> New Campaign
        </NavLink>
      </nav>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted hover:text-main hover:bg-border/40 transition-colors w-full"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
        {isDark ? 'Light mode' : 'Dark mode'}
      </button>

      <p className="px-3 mt-4 text-xs text-muted/50 font-mono">dist-job-processor</p>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-app flex">
        <Sidebar />
        <main className="flex-1 min-w-0 p-10">
          <Routes>
            <Route path="/" element={<CampaignList />} />
            <Route path="/create" element={<CreateCampaign />} />
            <Route path="/campaigns/:id" element={<div className="text-muted">Coming next…</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}