import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Activity, Users, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Overview</h1>
          <p className="text-muted mt-1">Manage and track your active marketing deployments.</p>
        </div>
        
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full bg-card border border-divider hover:text-accent transition-colors shadow-sm"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Active Campaigns" value="12" icon={<Activity className="text-accent" />} />
        <StatCard title="Total Reach" value="2.4M" icon={<Users className="text-accent" />} />
        <StatCard title="Conversion Rate" value="4.8%" icon={<TrendingUp className="text-accent" />} />
      </div>

      {/* Main Content Area */}
      <div className="bg-card rounded-panel border border-divider p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 border-b border-divider pb-4">Recent Deployments</h2>
        <div className="space-y-4 text-muted">
          <p>This is where your campaign table will go. Notice how the background, text, and borders automatically adjust.</p>
          <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md font-medium transition-colors">
            Create New Campaign
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable micro-component
function StatCard({ title, value, icon }) {
  return (
    <div className="bg-card rounded-panel border border-divider p-6 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-muted text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
      </div>
      <div className="p-3 bg-app rounded-full">
        {icon}
      </div>
    </div>
  );
}