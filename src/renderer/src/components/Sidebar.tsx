import React, { useState } from "react";
import { useAppStore, createNewQueryTab } from "../store/useAppStore";
import { DatabaseConnection, SchemaNode } from "@shared/types";
import ConnectionManager from "./modals/ConnectionManager";

const DB_ICONS: Record<string, string> = {
    sqlite: "📁",
    postgresql: "🐘",
    mysql: "🐬",
    mongodb: "🍃",
};

interface SidebarProps {
    width: number;
}

const SchemaItem: React.FC<{ node: SchemaNode; level: number; connectionId: string }> = ({
    node,
    level,
    connectionId,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const { openTableTab } = useAppStore();
    const hasChildren = node.children && node.children.length > 0;

    const handleNodeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type === "table") {
            const schemaName =
                (node.metadata?.schema as string | undefined) ||
                (node.metadata?.db as string | undefined) ||
                (node.id.includes("mongo-") ? node.id.split("-")[1] : undefined);
            openTableTab(connectionId, node.name, schemaName);
        } else if (hasChildren) {
            setIsOpen(!isOpen);
        }
    };

    const getIcon = () => {
        switch (node.type) {
            case "table":
                return <span className="text-blue-500 dark:text-blue-400">📊</span>;
            case "database":
                return <span className="text-amber-500 dark:text-amber-400">📂</span>;
            case "column":
                return <span className="text-slate-400 dark:text-slate-500 text-[10px]">🔹</span>;
            case "index":
                return <span className="text-amber-600 dark:text-amber-500 text-[10px]">🔑</span>;
            default:
                return null;
        }
    };

    return (
        <div className="select-none">
            <div
                className={`flex items-center gap-2 px-3 py-1 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-xs group transition-colors transition-colors duration-200
          ${isOpen ? "text-slate-900 dark:text-slate-100 font-bold" : "text-slate-600 dark:text-slate-400"}`}
                style={{ paddingLeft: `${level * 12 + 16}px` }}
                onClick={handleNodeClick}
            >
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded"
                    >
                        <svg
                            className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
                {!hasChildren && <div className="w-4" />}
                <span className="shrink-0">{getIcon()}</span>
                <span className={`truncate ${node.type === "table" ? "font-medium" : ""}`}>
                    {node.name}
                </span>
                {!!node.metadata?.dataType && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-600 ml-auto opacity-70 group-hover:opacity-100 italic">
                        {node.metadata.dataType as string}
                    </span>
                )}
            </div>
            {isOpen && hasChildren && node.children && (
                <div className="border-l border-slate-200 dark:border-slate-800/30 ml-4">
                    {node.children.map((child: SchemaNode) => (
                        <SchemaItem
                            key={child.id}
                            node={child}
                            level={level + 1}
                            connectionId={connectionId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ width }) => {
    const {
        connections,
        activeConnectionId,
        isSidebarCollapsed,
        setActiveConnection,
        removeConnection,
        addTab,
        addConnection,
        schemas,
        getSchema,
        savedConnections,
        isConnectionManagerOpen,
        connectionManagerId,
        connectionManagerMode,
        openConnectionManager,
        closeConnectionManager,
    } = useAppStore();

    const [searchQuery, setSearchQuery] = useState("");

    const handleOpenQuery = (connectionId: string) => {
        const tab = createNewQueryTab(connectionId);
        addTab(tab);
    };

    if (isSidebarCollapsed) return null;

    return (
        <>
            <aside
                className="flex flex-col bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 shadow-lg dark:shadow-2xl transition-colors duration-300"
                style={{ width }}
            >
                {/* Explorer Section */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-950/50">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                            Explorer
                        </h2>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => openConnectionManager(undefined, "list")}
                                className="p-1 rounded hover:bg-blue-500/10 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all font-bold"
                                title="Manage Connections"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Filter database..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-300
                          focus:outline-none focus:border-blue-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all
                          placeholder:text-slate-400 dark:placeholder:text-slate-700"
                        />
                        <svg className="w-3 h-3 absolute right-2.5 top-2.5 text-slate-300 dark:text-slate-700 group-focus-within:text-blue-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
                    {/* Saved Profiles Section */}
                    <div className="mb-4">
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-none flex items-center justify-between">
                            <span>Saved Profiles</span>
                            <button
                                onClick={() => openConnectionManager(undefined, "form")}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                                title="Add Profile"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                        {savedConnections.length === 0 ? (
                            <div className="px-3 py-2 text-[10px] text-slate-400 dark:text-slate-700 italic font-medium">No saved profiles. Click + to add.</div>
                        ) : (
                            savedConnections.map(conn => {
                                const isConnected = connections.some(c => c.id === conn.id);
                                return (
                                    <div
                                        key={conn.id}
                                        className="group flex items-center gap-2 px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-white/5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all"
                                        onClick={() => !isConnected && addConnection(conn)}
                                    >
                                        <span className={`text-base ${isConnected ? 'opacity-100' : 'opacity-40 grayscale group-hover:opacity-70 group-hover:grayscale-0'}`}>
                                            {DB_ICONS[conn.type] || '📁'}
                                        </span>
                                        <span className="truncate flex-1 font-bold">{conn.name}</span>
                                        {isConnected ? (
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                                        ) : (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openConnectionManager(conn.id, "form"); }}
                                                    className="p-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                                    title="Edit Profile"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); addConnection(conn); }}
                                                    className="p-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                                    title="Connect Now"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Active Connections Section */}
                    <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 mt-2 bg-slate-100/30 dark:bg-black/10">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-none">Active Connections</div>
                    </div>

                    {connections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 px-6 text-center opacity-40">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">No active connections</p>
                        </div>
                    ) : (
                        connections.map((conn) => {
                            const isActive = activeConnectionId === conn.id;
                            const schema = schemas[conn.id] || [];
                            const filteredSchema = schema.filter(node =>
                                node.name.toLowerCase().includes(searchQuery.toLowerCase())
                            );

                            return (
                                <div key={conn.id} className={`${isActive ? "mb-0" : "mb-1"}`}>
                                    <div
                                        className={`group flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-all duration-150 border-l-2
                                            ${isActive
                                                ? "bg-blue-500/5 dark:bg-blue-500/5 border-blue-500 text-slate-900 dark:text-slate-100 shadow-sm"
                                                : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200"
                                            }`}
                                        onClick={() => setActiveConnection(conn.id)}
                                    >
                                        <span className="text-lg shrink-0 filter grayscale group-hover:grayscale-0 transition-all">
                                            {DB_ICONS[conn.type] ?? "🗄️"}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate leading-tight mb-0.5 tracking-tight">
                                                {conn.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono truncate uppercase tracking-tighter">
                                                {conn.type}
                                            </p>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                title="Refresh Schema"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    getSchema(conn.id);
                                                }}
                                                className="p-1 rounded hover:bg-slate-300 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </button>
                                            <button
                                                title="Open Query"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenQuery(conn.id);
                                                }}
                                                className="p-1 rounded hover:bg-slate-300 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                            <button
                                                title="Remove Connection"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeConnection(conn.id);
                                                }}
                                                className="p-1 rounded hover:bg-slate-300 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {isActive && (
                                        <div className="py-1">
                                            <div className="px-5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                                                <span>{conn.type === 'mongodb' ? '🗄️' : '📂'}</span>
                                                <span>{conn.type === 'mongodb' ? 'Databases' : 'Tables'}</span>
                                            </div>
                                            {filteredSchema.map((node) => (
                                                <SchemaItem
                                                    key={node.id}
                                                    node={node}
                                                    level={1}
                                                    connectionId={conn.id}
                                                />
                                            ))}
                                            {filteredSchema.length === 0 && searchQuery && (
                                                <div className="px-8 py-2 text-[10px] italic text-slate-400 dark:text-slate-700 font-medium">
                                                    No matching results found.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 mt-auto transition-colors duration-300">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-700 uppercase tracking-tighter">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 animate-pulse" />
                        System Online
                    </div>
                </div>
            </aside>

            {isConnectionManagerOpen && (
                <ConnectionManager
                    initialId={connectionManagerId}
                    initialMode={connectionManagerMode}
                    onClose={closeConnectionManager}
                />
            )}
        </>
    );
};

export default Sidebar;
