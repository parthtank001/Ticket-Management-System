import React, { useState, useEffect } from 'react';

interface HealthCheckData {
  status: string;
  message: string;
}

export default function App() {
  const [healthData, setHealthData] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthCheck = async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: HealthCheckData = await response.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthCheck();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="text-center p-8 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full">
        {loading ? (
          <p className="text-slate-400 font-medium animate-pulse text-lg">Checking system status...</p>
        ) : error ? (
          <p className="text-red-400 font-semibold text-lg">{error}</p>
        ) : healthData ? (
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{healthData.status}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight" id="health-message">
              {healthData.message}
            </h1>
          </div>
        ) : null}
      </div>
    </main>
  );
}

