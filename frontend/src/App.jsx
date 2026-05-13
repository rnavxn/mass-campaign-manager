import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import CampaignList from './pages/CampaignList';
import CreateCampaign from './pages/CreateCampaign';


// The persistent Navbar (Logo left, Theme toggle right)
function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <nav className="bg-surface border-b border-border px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold tracking-tight hover:text-accent transition-colors">
        Mass Campaign Manager
      </Link>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full hover:bg-border text-muted hover:text-main transition-colors"
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* We use flex-col to push the main content down and fill the screen */}
      <div className="min-h-screen bg-app text-main flex flex-col font-sans transition-colors duration-200">
        <Navbar />
        <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
          <Routes>
            {/* Page 1 */}
            <Route path="/" element={<CampaignList />} />
            {/* Page 2 */}
            <Route path="/create" element={<CreateCampaign />} />

            {/* Placeholders for next logical stops */}
            <Route path="/create" element={<div className="text-muted">Create Page Coming Next...</div>} />
            <Route path="/campaigns/:id" element={<div className="text-muted">Detail Page Coming Next...</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}