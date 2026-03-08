import React from "react";
import { useAppStore } from "../store/useAppStore";

interface HeaderProps {
    onNewQuery: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewQuery }) => {
    const { activeConnectionId, connections, toggleSidebar, theme, setTheme } = useAppStore();
    const activeConnection = connections.find((c) => c.id === activeConnectionId);

    return (
        <header
            className="flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 select-none transition-colors duration-300"
            style={{ height: "var(--header-height)", WebkitAppRegion: "drag" } as React.CSSProperties}
        >
            {/* Left side: toggle + branding */}
            <div
                className="flex items-center gap-3"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                    title="Toggle Sidebar"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                            />
                        </svg>
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          murgiDB
                    </span>
                </div>
            </div>

            {/* Center: connection status */}
            <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                {activeConnection ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                        <span className="text-[11px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">
                            {activeConnection.name}
                        </span>
                        <div className="w-[1px] h-3 bg-green-500/20" />
                        <span className="text-[10px] text-slate-400 font-medium">
                            {activeConnection.type.toUpperCase()}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Disconnected</span>
                    </div>
                )}
            </div>

            {/* Right side: actions + theme toggle */}
            <div
                className="flex items-center gap-4"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
                {/* Theme Toggle Button Group */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-inner">
                    <button
                        onClick={() => setTheme('light')}
                        className={`p-1 rounded-md transition-all ${theme === 'light' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Light Mode"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`p-1 rounded-md transition-all ${theme === 'dark' ? 'bg-slate-900 text-blue-400 shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-400'}`}
                        title="Dark Mode"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setTheme('system')}
                        className={`p-1 rounded-md transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-400'}`}
                        title="System Default"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>

                <button
                    onClick={onNewQuery}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    title="New Query (Ctrl+T)"
                >
                    <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    New Query
                </button>
            </div>
        </header>
    );
};

export default Header;
