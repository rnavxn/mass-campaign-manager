import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Attempt to fetch from your Spring Boot backend
    fetch('http://localhost:8081/api/campaigns')
      .then(res => res.json())
      .then(data => {
        // Calculate the progress percentage on the fly
        const mappedCampaigns = data.map(camp => {
          const total = camp.totalRecipients || 0;
          // Progress includes both successes and failures
          const processed = (camp.processedRecipients || 0) + (camp.failedRecipients || 0);
          const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
          
          return { ...camp, progress };
        });

        setCampaigns(mappedCampaigns);
        setIsLoading(false);
      })
      .catch(err => {
        console.warn("Backend not reachable or empty. Injecting blueprint mock data.");
        // Fallback data so we can see the UI design immediately
        setCampaigns([
          { id: 'c1', name: 'Black Friday Blast', channel: 'EMAIL', status: 'RUNNING', progress: 64, createdAt: '2026-05-10T10:00:00Z' },
          { id: 'c2', name: 'Welcome Series', channel: 'SMS', status: 'COMPLETED', progress: 100, createdAt: '2026-05-09T14:30:00Z' },
          { id: 'c3', name: 'Inactive Reactivation', channel: 'EMAIL', status: 'FAILED', progress: 22, createdAt: '2026-05-08T09:15:00Z' },
          { id: 'c4', name: 'System Migration Notice', channel: 'PUSH', status: 'DRAFT', progress: 0, createdAt: '2026-05-12T11:00:00Z' },
        ]);
        setIsLoading(false);
      });
  }, []);

  // Compute stat pills from current table data
  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'RUNNING').length,
    completed: campaigns.filter(c => c.status === 'COMPLETED').length,
  };

  // Maps status text to our specific theme variables
  const getStatusColor = (status) => {
    switch(status) {
      case 'RUNNING': return 'text-running border-running/30 bg-running/10';
      case 'COMPLETED': return 'text-completed border-completed/30 bg-completed/10';
      case 'FAILED': return 'text-failed border-failed/30 bg-failed/10';
      case 'SCHEDULED': return 'text-scheduled border-scheduled/30 bg-scheduled/10';
      default: return 'text-draft border-draft/30 bg-draft/10'; // DRAFT
    }
  };

  const getBarColor = (status) => {
    switch(status) {
      case 'RUNNING': return 'bg-running';
      case 'COMPLETED': return 'bg-completed';
      case 'FAILED': return 'bg-failed';
      default: return 'bg-draft';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">Campaigns</h1>
          {/* 3 Stat Pills */}
          <div className="flex gap-3 text-sm font-medium">
            <div className="bg-surface border border-border px-4 py-1.5 rounded-full">
              <span className="text-muted mr-2">Total:</span>{stats.total}
            </div>
            <div className="bg-surface border border-border px-4 py-1.5 rounded-full">
              <span className="text-muted mr-2">Running:</span>{stats.running}
            </div>
            <div className="bg-surface border border-border px-4 py-1.5 rounded-full">
              <span className="text-muted mr-2">Completed:</span>{stats.completed}
            </div>
          </div>
        </div>
        
        <Link 
          to="/create" 
          className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> New Campaign
        </Link>
      </div>

      {/* Campaign Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-app/50 text-muted text-xs uppercase tracking-wider font-semibold">
              <th className="p-4 w-1/4">Name</th>
              <th className="p-4">Channel</th>
              <th className="p-4">Status</th>
              <th className="p-4 w-1/3">Progress</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan="5" className="p-8 text-center text-muted">Loading campaigns...</td></tr>
            ) : (
              campaigns.map((camp) => (
                <tr 
                  key={camp.id} 
                  onClick={() => navigate(`/campaigns/${camp.id}`)}
                  className="hover:bg-border/30 cursor-pointer transition-colors group"
                >
                  {/* Name */}
                  <td className="p-4 font-medium group-hover:text-accent transition-colors">
                    {camp.name}
                  </td>
                  
                  {/* Channel */}
                  <td className="p-4 text-muted text-sm">{camp.channel}</td>
                  
                  {/* Status Badge (JetBrains Mono) */}
                  <td className="p-4">
                    <span className={`font-mono text-[11px] font-medium px-2.5 py-1 rounded border ${getStatusColor(camp.status)}`}>
                      {camp.status}
                    </span>
                  </td>
                  
                  {/* Inline Progress Bar */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-app border border-border rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getBarColor(camp.status)} transition-all duration-1000`}
                          style={{ width: `${camp.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-muted min-w-[4ch] text-right">
                        {camp.progress}%
                      </span>
                    </div>
                  </td>
                  
                  {/* Date (JetBrains Mono) */}
                  <td className="p-4 text-muted text-sm font-mono">
                    {new Date(camp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}