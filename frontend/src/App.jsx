import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import { Sun, Moon, LayoutList, PlusCircle } from 'lucide-react';
import CampaignList from './pages/CampaignList';
import CreateCampaign from './pages/CreateCampaign';
import CampaignDetail from './pages/CampaignDetail';

function Sidebar() {
  const { isDark, toggleTheme } = useTheme();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-accent/10 text-accent'
        : 'text-muted hover:text-main hover:bg-border/40'
    }`;

  return (
    
    // 1. h-full ensures it respects the parent's strict height
    <aside className="w-52 shrink-0 bg-surface border-r border-border flex flex-col h-full py-6 px-3">
      
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-6 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 6.5L5 9.5L11 3.5" stroke="#0f0d12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-semibold text-sm tracking-tight">CampaignOS</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0 pb-4">
        <NavLink to="/" end className={linkClass}>
          <LayoutList size={16} /> Campaigns
        </NavLink>
        <NavLink to="/create" className={linkClass}>
          <PlusCircle size={16} /> New Campaign
        </NavLink>
      </nav>

      {/* Utilities Container */}
      <div className="mt-auto shrink-0 pt-4 border-t border-border/40">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted hover:text-main hover:bg-border/40 transition-colors w-full"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>

        <p className="px-3 mt-4 text-[10px] uppercase tracking-wider text-muted/50 font-mono">
          dist-job-processor
        </p>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* 2. Changed min-h-screen to h-screen and added overflow-hidden to lock the layout strictly to the viewport */}
      <div className="h-screen w-full overflow-hidden bg-app flex">
        <Sidebar />
        {/* 3. overflow-y-auto added to main so page content scrolls natively while the sidebar stays pinned */}
        <main className="flex-1 min-w-0 overflow-y-auto p-10">
          <Routes>
            <Route path="/" element={<CampaignList />} />
            <Route path="/create" element={<CreateCampaign />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}