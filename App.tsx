import React, { useState, useRef, useEffect } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { LogMessage, ConnectionState } from './types';
import { ArcReactor } from './components/ArcReactor';

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const handleLog = (message: LogMessage) => {
    setLogs((prev) => [...prev, message]);
  };

  const { connect, disconnect, connectionState, volume } = useGeminiLive({
    onLog: handleLog,
  });

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isError = connectionState === ConnectionState.ERROR;

  return (
    <div className="relative min-h-screen bg-slate-950 text-cyan-400 font-mono overflow-hidden selection:bg-cyan-900 selection:text-white">
      
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_90%)] pointer-events-none"></div>

      {/* Header HUD */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">J.A.R.V.I.S.</h1>
          <span className="text-xs tracking-[0.3em] text-cyan-600 mt-1">JUST A RATHER VERY INTELLIGENT SYSTEM</span>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-xs text-cyan-600">SYSTEM STATUS</div>
          <div className={`text-xl font-bold tracking-wider ${isConnected ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'text-red-500'}`}>
            {connectionState}
          </div>
          <div className="text-xs text-cyan-700 mt-1">{new Date().toLocaleDateString()}</div>
        </div>
      </header>

      {/* Main Interface */}
      <main className="relative z-0 flex flex-col items-center justify-center min-h-screen p-4">
        
        {/* Central Visualizer */}
        <div className="mb-8 md:mb-0 scale-75 md:scale-100">
          <ArcReactor isActive={isConnected} volume={volume} />
        </div>

        {/* Start/Stop Controls */}
        <div className="absolute bottom-12 md:bottom-24 z-20 flex gap-4">
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={connectionState === ConnectionState.CONNECTING}
              className={`
                group relative px-8 py-3 bg-transparent border border-cyan-500 text-cyan-400 uppercase tracking-widest font-bold
                hover:bg-cyan-900/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
                before:absolute before:top-0 before:left-0 before:w-2 before:h-2 before:border-t before:border-l before:border-cyan-400
                after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2 before:border-b before:border-r after:border-cyan-400
              `}
            >
              {connectionState === ConnectionState.CONNECTING ? 'INITIALIZING...' : 'INITIATE SYSTEM'}
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="
                group relative px-8 py-3 bg-transparent border border-red-500 text-red-500 uppercase tracking-widest font-bold
                hover:bg-red-900/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all duration-300
                before:absolute before:top-0 before:left-0 before:w-2 before:h-2 before:border-t before:border-l before:border-red-500
                after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2 before:border-b before:border-r after:border-red-500
              "
            >
              TERMINATE
            </button>
          )}
        </div>

        {/* Error Display */}
        {isError && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 border border-red-500 bg-red-950/80 p-4 backdrop-blur-sm z-50 max-w-sm text-center">
            <h3 className="font-bold mb-2">SYSTEM CRITICAL</h3>
            <p className="text-sm">Connection failed. Please check API Key configuration.</p>
          </div>
        )}
      </main>

      {/* Data/Log Panels */}
      <aside className="fixed top-24 bottom-24 right-4 w-80 hidden lg:flex flex-col gap-4 pointer-events-none z-10">
        <div className="flex-1 border border-cyan-800 bg-slate-900/50 backdrop-blur-sm p-4 rounded-sm overflow-hidden flex flex-col shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          <div className="flex justify-between items-center mb-2 border-b border-cyan-800 pb-2">
             <span className="text-xs tracking-widest text-cyan-600">COMMUNICATION LOG</span>
             <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
          </div>
          
          <div className="flex-1 overflow-y-auto font-mono text-xs space-y-3 pr-2 scrollbar-thin scrollbar-thumb-cyan-700 scrollbar-track-transparent pointer-events-auto">
            {logs.map((log) => (
              <div key={log.id} className={`flex flex-col ${log.sender === 'USER' ? 'items-end text-right' : 'items-start'}`}>
                <span className={`text-[10px] mb-1 px-1 ${log.sender === 'JARVIS' ? 'bg-cyan-900/50 text-cyan-300' : log.sender === 'USER' ? 'bg-slate-700 text-slate-300' : 'text-cyan-600'}`}>
                  {log.sender}
                </span>
                <span className={`leading-relaxed ${log.sender === 'SYSTEM' ? 'text-cyan-700 italic' : 'text-cyan-100'}`}>
                  {log.text}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        <div className="h-48 border border-cyan-800 bg-slate-900/50 backdrop-blur-sm p-4 rounded-sm shadow-[0_0_15px_rgba(6,182,212,0.1)]">
           <div className="flex justify-between items-center mb-2 border-b border-cyan-800 pb-2">
             <span className="text-xs tracking-widest text-cyan-600">AUDIO SPECTRUM</span>
           </div>
           <div className="flex items-end justify-between h-32 gap-1">
              {/* Fake spectrum bars just for visuals using volume prop */}
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-cyan-500/50 transition-all duration-75 ease-out"
                  style={{ 
                    height: `${Math.max(5, Math.random() * (volume * 400))}px`,
                    opacity: 0.3 + (i / 20) * 0.7
                  }}
                ></div>
              ))}
           </div>
        </div>
      </aside>

      {/* Decorative Corners */}
      <div className="fixed top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg pointer-events-none"></div>
      <div className="fixed top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-lg pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-500/50 rounded-br-lg pointer-events-none"></div>

    </div>
  );
};

export default App;
