import React, { useState } from "react";
import { useAppStore, createNewQueryTab } from "../store/useAppStore";
import { DatabaseConnection } from "@shared/types";

const DB_ICONS: Record<string, string> = {
    postgresql: "🐘",
    mysql: "🐬",
    sqlite: "📦",
    mssql: "🪟",
    mongodb: "🍃",
};

interface SidebarProps {
    width: number;
}

const Sidebar: React.FC<SidebarProps> = ({ width }) => {
    const {
        connections,
        activeConnectionId,
        isSidebarCollapsed,
        setActiveConnection,
        removeConnection,
        addTab,
        addConnection,
    } = useAppStore();

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newConnName, setNewConnName] = useState("");

    const handleAddDemoConnection = () => {
        const demo: DatabaseConnection = {
            id: `conn-${Date.now()}`,
            name: newConnName || "Demo PostgreSQL",
            type: "postgresql",
            host: "localhost",
            port: 5432,
            database: "demo_db",
            username: "postgres",
        };
        addConnection(demo);
        setShowAddDialog(false);
        setNewConnName("");
    };

    const handleOpenQuery = (connectionId: string) => {
        const tab = createNewQueryTab(connectionId);
        addTab(tab);
    };

    if (isSidebarCollapsed) return null;

    return (
        <aside
            className="flex flex-col bg-slate-950 border-r border-slate-800 overflow-hidden shrink-0"
            style={{ width }}
        >
            {/* Connections section */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Connections
                </span>
                <button
                    onClick={() => setShowAddDialog(true)}
                    className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
                    title="Add Connection"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Add Connection Dialog */}
            {showAddDialog && (
                <div className="m-2 p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400 mb-2 font-medium">New Connection</p>
                    <input
                        type="text"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200
                       focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-600 mb-2"
                        placeholder="Connection name..."
                        value={newConnName}
                        onChange={(e) => setNewConnName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddDemoConnection()}
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button onClick={handleAddDemoConnection} className="btn-primary text-xs py-1 px-2">
                            Add Demo
                        </button>
                        <button
                            onClick={() => setShowAddDialog(false)}
                            className="btn-ghost text-xs py-1 px-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Connection list */}
            <div className="flex-1 overflow-y-auto py-1">
                {connections.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                        </div>
                        <p className="text-xs text-slate-600">No connections yet</p>
                        <button
                            onClick={() => setShowAddDialog(true)}
                            className="mt-2 text-xs text-blue-500 hover:text-blue-400"
                        >
                            Add one +
                        </button>
                    </div>
                )}

                {connections.map((conn) => (
                    <div
                        key={conn.id}
                        className={`group flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors duration-150
              ${activeConnectionId === conn.id
                                ? "bg-blue-500/10 text-blue-400"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                            }`}
                        onClick={() => setActiveConnection(conn.id)}
                    >
                        <span className="text-base shrink-0">
                            {DB_ICONS[conn.type] ?? "🗄️"}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-none mb-0.5">
                                {conn.name}
                            </p>
                            <p className="text-xs text-slate-600 truncate">
                                {conn.host ? `${conn.host}:${conn.port}` : conn.type}
                            </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                title="Open Query"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenQuery(conn.id);
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-blue-400 hover:bg-blue-500/10"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <button
                                title="Remove Connection"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeConnection(conn.id);
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom nav */}
            <div className="border-t border-slate-800/50 py-2">
                <button className="sidebar-item w-full">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
