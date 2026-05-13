import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CreateCampaign from './pages/CreateCampaign';
import CampaignDetail from './pages/CampaignDetail';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-app text-main transition-colors duration-200 font-sans">
        {/* Simple Top Navigation */}
        <nav className="bg-app shadow-sm px-6 py-4 flex justify-between items-center border-light">
          <Link to="/" className="text-xl font-bold text-blue-600 tracking-tight">
            Mass Campaign Manager
          </Link>
          <Link to="/create" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
            + New Campaign
          </Link>
        </nav>

        {/* Page Content Container */}
        <main className="max-w-6xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateCampaign />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}