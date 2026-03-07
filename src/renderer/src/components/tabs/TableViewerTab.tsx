import React, { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Tab, QueryResult } from "@shared/types";
import ResultViewer from "../results/ResultViewer";

interface TableViewerTabProps {
    tab: Tab;
}

const TableViewerTab: React.FC<TableViewerTabProps> = ({ tab }) => {
    const { queryResults, setQueryResult, connections } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const conn = connections.find(c => c.id === tab.connectionId);
    const result = queryResults[tab.id];

    const fetchData = async () => {
        if (!tab.connectionId || !tab.tableName) return;

        setIsLoading(true);
        try {
            let query = "";
            if (conn?.type === 'mongodb') {
                query = JSON.stringify({
                    mode: "find",
                    database: tab.databaseName || "test",
                    collection: tab.tableName || "",
                    filter: {},
                    limit: 100
                });
            } else {
                // Basic select for table preview (SQL)
                query = `SELECT * FROM "${tab.tableName}" LIMIT 100`;
            }

            const res = await window.electronAPI.executeQuery(tab.connectionId, query);
            setQueryResult(tab.id, res);
        } catch (error: any) {
            setQueryResult(tab.id, { type: "error", message: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!result) {
            fetchData();
        }
    }, [tab.id]);

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-slate-900/50 transition-colors duration-300">
            {/* Table Header / Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-xl">📊</span>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {tab.databaseName ? `${tab.databaseName}.${tab.tableName}` : tab.tableName}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-mono font-bold tracking-tight">
                            {conn?.type === 'mongodb' ? 'Collection Viewer • MongoDB' : 'Table Viewer • SQLite'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/5 text-slate-400 hover:text-blue-500 dark:hover:text-slate-100 transition-colors disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <svg
                            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {isLoading && !result && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-slate-950/20 backdrop-blur-sm z-10 text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                            <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading table data...</span>
                        </div>
                    </div>
                )}

                {result && (
                    <div className="h-full flex flex-col">
                        <ResultViewer result={result} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TableViewerTab;
