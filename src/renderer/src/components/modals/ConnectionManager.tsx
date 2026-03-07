import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { DatabaseConnection, DatabaseType } from "@shared/types";

interface ConnectionManagerProps {
    onClose: () => void;
    initialId?: string;
    initialMode?: "list" | "form";
}

const SUPPORTED_DATABASES: Record<DatabaseType, boolean> = {
    sqlite: true,
    mongodb: true,
    postgresql: false,
    mysql: false,
    mssql: false,
};

const ConnectionManager: React.FC<ConnectionManagerProps> = ({ onClose, initialId, initialMode = "list" }) => {
    const { savedConnections, saveConnectionProfile, deleteConnectionProfile, addConnection } = useAppStore();
    const [mode, setMode] = useState<"list" | "form">(initialMode);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<DatabaseConnection>>({
        type: "sqlite",
        name: "",
        filename: "",
        directConnection: false,
        tls: false
    });
    const [isTesting, setIsTesting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

    useEffect(() => {
        if (initialId) {
            const conn = savedConnections.find(c => c.id === initialId);
            if (conn) {
                setEditingId(conn.id);
                setFormData(conn);
                setMode("form");
            }
        } else if (initialMode === "form") {
            handleNew();
        }
    }, [initialId, initialMode, savedConnections]);

    const handleEdit = (conn: DatabaseConnection) => {
        setEditingId(conn.id);
        setFormData(conn);
        setTestResult(null);
        setMode("form");
    };

    const handleNew = () => {
        setEditingId(null);
        setFormData({
            type: "sqlite",
            name: "",
            filename: "",
            directConnection: false,
            tls: false
        });
        setTestResult(null);
        setMode("form");
    };

    const handleOpenFile = async () => {
        const path = await window.electronAPI.openFile();
        if (path) {
            setFormData(prev => ({ ...prev, filename: path }));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = editingId || `conn-${Date.now()}`;
        const newProfile: DatabaseConnection = {
            ...formData,
            id,
        } as DatabaseConnection;

        await saveConnectionProfile(newProfile);
        setMode("list");
    };

    const handleConnect = async (conn: DatabaseConnection) => {
        setIsTesting(true);
        const result = await addConnection(conn);
        setIsTesting(false);
        if (result.success) {
            onClose();
        } else {
            setTestResult({ success: false, message: result.error });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[85vh] overflow-hidden transition-colors duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        {mode === "form" && (
                            <button
                                onClick={() => setMode("list")}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span className="text-blue-500">{mode === 'form' ? '📝' : '🔌'}</span>
                            {mode === "form" ? (editingId ? "Edit Profile" : "New Connection") : "Connection Manager"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-slate-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {mode === "list" ? (
                        <>
                            {/* Sidebar: Profile List */}
                            <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 overflow-y-auto">
                                <div className="p-3 space-y-2">
                                    <button
                                        onClick={handleNew}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-transparent hover:bg-blue-50 dark:hover:bg-blue-400/10 border border-blue-200 dark:border-blue-500/20 transition-all shadow-sm"
                                    >
                                        <span>➕</span> Create New Profile
                                    </button>
                                    <div className="pt-2">
                                        <p className="px-3 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">Saved Profiles</p>
                                        {savedConnections.length === 0 ? (
                                            <p className="px-3 py-4 text-xs text-slate-400 dark:text-slate-600 text-center italic">No profiles saved yet.</p>
                                        ) : (
                                            savedConnections.map(conn => (
                                                <div
                                                    key={conn.id}
                                                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all mb-1 border border-transparent
                                                        ${editingId === conn.id ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
                                                    onClick={() => handleEdit(conn)}
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span>{conn.type === 'sqlite' ? '📁' : '🔌'}</span>
                                                        <span className="truncate text-sm font-medium">{conn.name || 'Untitled'}</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteConnectionProfile(conn.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-900/20 text-center space-y-4">
                                <div className="text-4xl">🎛️</div>
                                <div className="space-y-1">
                                    <h3 className="text-slate-900 dark:text-slate-300 font-bold uppercase tracking-tight">Profile Management</h3>
                                    <p className="text-slate-500 text-sm max-w-xs font-medium">Select a profile from the left to edit, or create a new one to get started.</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Main Content: Form */
                        <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/20">
                            <form onSubmit={handleSave} className="space-y-6 max-w-lg mx-auto">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Connection Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Local Analytics Data"
                                        value={formData.name}
                                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 font-bold"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Database Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['sqlite', 'postgresql', 'mysql', 'mongodb'] as DatabaseType[]).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                disabled={!SUPPORTED_DATABASES[t]}
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    type: t,
                                                    name: prev.name || (t === 'sqlite' ? 'Local SQLite' : t === 'mongodb' ? 'Local MongoDB' : ''),
                                                    uri: t === 'mongodb' ? 'mongodb://localhost:27017' : prev.uri,
                                                }))}
                                                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm transition-all
                                                ${formData.type === t
                                                        ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm'
                                                        : SUPPORTED_DATABASES[t]
                                                            ? 'bg-white dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 shadow-sm'
                                                            : 'bg-slate-100 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-500 grayscale opacity-50 cursor-not-allowed'}`}
                                            >
                                                <span className="text-xl">{t === 'sqlite' ? '📁' : t === 'postgresql' ? '🐘' : t === 'mysql' ? '🐬' : '🍃'}</span>
                                                <span className="font-medium capitalize">{t}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.type === 'sqlite' && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Database File Path</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    placeholder="Choose a .db file..."
                                                    value={formData.filename}
                                                    className="flex-1 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none font-bold shadow-inner"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleOpenFile}
                                                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95"
                                                >
                                                    Browse...
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {formData.type === 'mongodb' && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Connection URI</label>
                                            <input
                                                type="text"
                                                placeholder="mongodb://localhost:27017"
                                                value={formData.uri}
                                                onChange={e => setFormData(prev => ({ ...prev, uri: e.target.value }))}
                                                className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-bold shadow-inner"
                                                required
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setShowAdvanced(!showAdvanced)}
                                                className="text-[10px] text-blue-500 hover:text-blue-400 font-semibold uppercase tracking-wider flex items-center gap-1"
                                            >
                                                {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                                                <svg className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        </div>

                                        {showAdvanced && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Auth Source</label>
                                                        <input
                                                            type="text"
                                                            placeholder="admin"
                                                            value={formData.authSource}
                                                            onChange={e => setFormData(prev => ({ ...prev, authSource: e.target.value }))}
                                                            className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none font-bold"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-4 pt-6">
                                                        <label className={`flex items-center gap-2 group ${formData.uri?.includes('+srv') ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.directConnection && !formData.uri?.includes('+srv')}
                                                                disabled={formData.uri?.includes('+srv')}
                                                                onChange={e => setFormData(prev => ({ ...prev, directConnection: e.target.checked }))}
                                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                                            />
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-slate-300 transition-colors font-bold uppercase tracking-tighter">Direct Connection</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.tls}
                                                                onChange={e => setFormData(prev => ({ ...prev, tls: e.target.checked }))}
                                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-slate-300 transition-colors font-bold uppercase tracking-tighter">TLS/SSL</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {testResult && !testResult.success && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-500 text-xs font-bold">
                                        Connection Failed: {testResult.message}
                                    </div>
                                )}

                                <div className="pt-6 flex gap-3">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                    >
                                        {editingId ? 'Update Profile' : 'Save Profile'}
                                    </button>
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={() => handleConnect(formData as DatabaseConnection)}
                                            disabled={isTesting}
                                            className="flex-1 bg-white dark:bg-slate-100 hover:bg-slate-50 dark:hover:bg-white text-slate-900 font-bold py-2.5 rounded-lg text-sm shadow-xl transition-all disabled:opacity-50 active:scale-95 border border-slate-200 dark:border-transparent"
                                        >
                                            {isTesting ? 'Connecting...' : 'Connect Now'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between transition-colors duration-300">
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-tighter">Profiles are stored locally in your app data folder.</p>
                    <div className="flex gap-4">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-tight"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> System Ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectionManager;
