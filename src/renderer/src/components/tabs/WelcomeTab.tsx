import React from "react";
import { useAppStore, createNewQueryTab } from "../../store/useAppStore";

const WelcomeTab: React.FC = () => {
    const { addTab, openConnectionManager } = useAppStore();

    const handleNewQuery = () => {
        addTab(createNewQueryTab());
    };

    const handleAddConnection = () => {
        openConnectionManager(undefined, "form");
    };

    return (
        <div className="flex flex-col items-center justify-center flex-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 select-none transition-colors duration-300">
            {/* Hero */}
            <div className="flex flex-col items-center gap-4 mb-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/25">
                    <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">DB Workbench</h1>
                    <p className="text-sm text-slate-500">Universal Database Management Tool</p>
                </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
                <button
                    onClick={handleNewQuery}
                    className="flex flex-col items-start gap-2 p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800
                     border border-slate-200 dark:border-slate-700/50 hover:border-blue-500/50 dark:hover:border-slate-600
                     rounded-xl transition-all duration-200 text-left group shadow-sm hover:shadow-md"
                >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/25 transition-colors">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">New Query</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium uppercase tracking-tight">Open a SQL editor</p>
                    </div>
                </button>

                <button
                    onClick={handleAddConnection}
                    className="flex flex-col items-start gap-2 p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800
                     border border-slate-200 dark:border-slate-700/50 hover:border-green-500/50 dark:hover:border-slate-600
                     rounded-xl transition-all duration-200 text-left group shadow-sm hover:shadow-md"
                >
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 dark:bg-green-500/15 flex items-center justify-center group-hover:bg-green-500/20 dark:group-hover:bg-green-500/25 transition-colors">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Add Connection</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium uppercase tracking-tight">Connect to database</p>
                    </div>
                </button>
            </div>

            {/* Supported databases */}
            <div className="text-center">
                <p className="text-xs text-slate-600 mb-3">Supported databases</p>
                <div className="flex items-center gap-4 text-xl">
                    {["🐘", "🐬", "📦", "🪟", "🍃"].map((icon, i) => (
                        <span key={i} className="opacity-40 hover:opacity-80 transition-opacity cursor-default" title={["PostgreSQL", "MySQL", "SQLite", "MSSQL", "MongoDB"][i]}>
                            {icon}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WelcomeTab;
