import React, { useState } from "react";
import { useAppStore, createNewQueryTab } from "../store/useAppStore";
import { DatabaseConnection, SchemaNode } from "@shared/types";

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
            openTableTab(connectionId, node.name);
        } else if (hasChildren) {
            setIsOpen(!isOpen);
        }
    };

    const getIcon = () => {
        switch (node.type) {
            case "table":
                return <span className="text-blue-400">📊</span>;
            case "column":
                return <span className="text-slate-500 text-[10px]">🔹</span>;
            case "index":
                return <span className="text-amber-500 text-[10px]">🔑</span>;
            default:
                return null;
        }
    };

    return (
        <div className="select-none">
            <div
                className={`flex items-center gap-2 px-3 py-1 hover:bg-white/5 cursor-pointer text-xs group
          ${isOpen ? "text-slate-100" : "text-slate-400"}`}
                style={{ paddingLeft: `${level * 12 + 16}px` }}
                onClick={handleNodeClick}
            >
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                        className="p-0.5 hover:bg-white/10 rounded"
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
                    <span className="text-[10px] text-slate-600 ml-auto opacity-70 group-hover:opacity-100 italic">
                        {node.metadata.dataType as string}
                    </span>
                )}
            </div>
            {isOpen && hasChildren && node.children && (
                <div className="border-l border-slate-800/30 ml-4">
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
    } = useAppStore();

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newConnName, setNewConnName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const handleAddSQLiteConnection = async () => {
        const filePath = await window.electronAPI.openFile();
        if (!filePath) return;

        const connection: DatabaseConnection = {
            id: `conn-${Date.now()}`,
            name: newConnName || filePath.split(/[\\/]/).pop() || "SQLite DB",
            type: "sqlite",
            filename: filePath,
        };

        const result = await addConnection(connection);
        if (result.success) {
            setShowAddDialog(false);
            setNewConnName("");
        } else {
            alert(`Failed to connect: ${result.error}`);
        }
    };

    const handleOpenQuery = (connectionId: string) => {
        const tab = createNewQueryTab(connectionId);
        addTab(tab);
    };

    if (isSidebarCollapsed) return null;

    return (
        <aside
            className="flex flex-col bg-slate-950 border-r border-slate-800 overflow-hidden shrink-0 shadow-2xl"
            style={{ width }}
        >
            {/* Search/Header */}
            <div className="p-3 border-b border-slate-800 space-y-3 bg-slate-950/50">
                <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                        Explorer
                    </h2>
                    <button
                        onClick={() => setShowAddDialog(true)}
                        className="p-1 rounded hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 transition-all"
                        title="New Connection"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Search tables..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300
                      focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all
                      placeholder:text-slate-700"
                    />
                    <svg className="w-3 h-3 absolute right-2.5 top-2.5 text-slate-700 group-focus-within:text-blue-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Add Connection Dialog */}
            {showAddDialog && (
                <div className="m-2 p-3 bg-slate-900 rounded-lg border border-slate-700 shadow-xl border-t-blue-500">
                    <p className="text-[10px] font-bold text-blue-400 mb-2 uppercase">New SQLite Connection</p>
                    <input
                        type="text"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200
                       focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-600 mb-2"
                        placeholder="Connection name (optional)..."
                        value={newConnName}
                        onChange={(e) => setNewConnName(e.target.value)}
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddSQLiteConnection}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded transition-colors uppercase leading-none"
                        >
                            Select File
                        </button>
                        <button
                            onClick={() => setShowAddDialog(false)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded transition-colors uppercase leading-none"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Connection list */}
            <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
                {connections.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            No connections established.
                        </p>
                        <button
                            onClick={() => setShowAddDialog(true)}
                            className="mt-3 text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider"
                        >
                            Connect now +
                        </button>
                    </div>
                )}

                {connections.map((conn) => {
                    const isActive = activeConnectionId === conn.id;
                    const schema = schemas[conn.id] || [];
                    const filteredSchema = schema.filter(node =>
                        node.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    return (
                        <div key={conn.id} className="mb-2">
                            <div
                                className={`group flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-all duration-150 border-l-2
                  ${isActive
                                        ? "bg-blue-500/5 border-blue-500 text-slate-100"
                                        : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                    }`}
                                onClick={() => setActiveConnection(conn.id)}
                            >
                                <span className="text-lg shrink-0 filter grayscale group-hover:grayscale-0 transition-all">
                                    {DB_ICONS[conn.type] ?? "🗄️"}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate leading-tight mb-0.5">
                                        {conn.name}
                                    </p>
                                    <p className="text-[10px] text-slate-600 font-mono truncate uppercase tracking-tighter">
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
                                        className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-blue-400"
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
                                        className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-blue-400"
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
                                        className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-red-400"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Schema Tree */}
                            {isActive && (
                                <div className="py-1">
                                    <div className="px-5 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                                        <span>📂</span>
                                        <span>Tables</span>
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
                                        <div className="px-8 py-2 text-[10px] italic text-slate-700">
                                            No matching tables found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom info */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700 uppercase">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 animate-pulse" />
                    System Online
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
