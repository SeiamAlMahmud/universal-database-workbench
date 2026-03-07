import React from "react";
import { useAppStore } from "../store/useAppStore";

interface HeaderProps {
    onNewQuery: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewQuery }) => {
    const { activeConnectionId, connections, toggleSidebar } = useAppStore();
    const activeConnection = connections.find((c) => c.id === activeConnectionId);

    return (
        <header
            className="flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950 select-none"
            style={{ height: "var(--header-height)", WebkitAppRegion: "drag" } as React.CSSProperties}
        >
            {/* Left side: toggle + branding */}
            <div
                className="flex items-center gap-3"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
                <button
                    onClick={toggleSidebar}
                    className="btn-ghost p-1.5"
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
                    <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
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
                    <span className="text-sm font-semibold text-slate-200">
                        DB Workbench
                    </span>
                </div>
            </div>

            {/* Center: connection status */}
            <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                {activeConnection ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-green-400 font-medium">
                            {activeConnection.name}
                        </span>
                        <span className="text-xs text-slate-500">
                            {activeConnection.type}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        <span className="text-xs text-slate-500">Not connected</span>
                    </div>
                )}
            </div>

            {/* Right side: actions */}
            <div
                className="flex items-center gap-2"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
                <button
                    onClick={onNewQuery}
                    className="btn-primary text-xs"
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
