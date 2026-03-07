import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { DatabaseConnection, DatabaseType } from "@shared/types";

interface ConnectionManagerProps {
    onClose: () => void;
    initialId?: string;
    initialMode?: "list" | "form";
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({ onClose, initialId, initialMode = "list" }) => {
    const { savedConnections, saveConnectionProfile, deleteConnectionProfile, addConnection } = useAppStore();
    const [mode, setMode] = useState<"list" | "form">(initialMode);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<DatabaseConnection>>({
        type: "sqlite",
        name: "",
        filename: "",
    });
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

    useEffect(() => {
        if (initialId) {
            const conn = savedConnections.find(c => c.id === initialId);
            if (conn) {
                setEditingId(conn.id);
                setFormData(conn);
            }
        }
    }, [initialId, savedConnections]);

    const handleEdit = (conn: DatabaseConnection) => {
        setEditingId(conn.id);
        setFormData(conn);
        setTestResult(null);
    };

    const handleNew = () => {
        setEditingId(null);
        setFormData({
            type: "sqlite",
            name: "",
            filename: "",
        });
        setTestResult(null);
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
        handleNew();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <span className="text-blue-500">🔌</span> Connection Manager
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar: Profile List */}
                    <div className="w-1/3 border-r border-slate-800 bg-slate-950/30 overflow-y-auto">
                        <div className="p-3 space-y-2">
                            <button
                                onClick={handleNew}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all
                                    ${!editingId ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50'}`}
                            >
                                <span>➕</span> New Connection
                            </button>
                            <div className="pt-2">
                                <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Saved Profiles</p>
                                {savedConnections.length === 0 ? (
                                    <p className="px-3 py-4 text-xs text-slate-600 text-center italic">No profiles saved yet.</p>
                                ) : (
                                    savedConnections.map(conn => (
                                        <div
                                            key={conn.id}
                                            className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all mb-1
                                                ${editingId === conn.id ? 'bg-slate-800 text-slate-100' : 'hover:bg-slate-800/40 text-slate-400'}`}
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

                    {/* Main Content: Form */}
                    <div className="flex-1 p-8 overflow-y-auto bg-slate-900/20">
                        <form onSubmit={handleSave} className="space-y-6 max-w-lg mx-auto">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Connection Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Local Analytics Data"
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Database Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['sqlite', 'postgresql', 'mysql', 'mongodb'] as DatabaseType[]).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            disabled={t !== 'sqlite'} // Implement others later
                                            onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm transition-all
                                                ${formData.type === t ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-950/50 border-slate-800 text-slate-500 grayscale opacity-50 cursor-not-allowed'}`}
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
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Database File Path</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                placeholder="Choose a .db file..."
                                                value={formData.filename}
                                                className="flex-1 bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-200 focus:outline-none font-mono"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={handleOpenFile}
                                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-medium transition-colors border border-slate-700"
                                            >
                                                Browse...
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {testResult && !testResult.success && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs">
                                    连接失败: {testResult.message}
                                </div>
                            )}

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm shadow-lg shadow-blue-500/20 transition-all"
                                >
                                    {editingId ? 'Update Profile' : 'Save Profile'}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => handleConnect(formData as DatabaseConnection)}
                                        disabled={isTesting}
                                        className="flex-1 bg-slate-100 hover:bg-white text-slate-900 font-semibold py-2.5 rounded-lg text-sm shadow-xl transition-all disabled:opacity-50"
                                    >
                                        {isTesting ? 'Connecting...' : 'Connect Now'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <p className="text-[10px] text-slate-600 font-medium">Profiles are stored locally in your app data folder.</p>
                    <div className="flex gap-4">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> System Ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectionManager;
