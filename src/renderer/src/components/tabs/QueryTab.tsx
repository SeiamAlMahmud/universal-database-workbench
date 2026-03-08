import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { useAppStore, createNewQueryTab } from "../../store/useAppStore";
import { Tab, QueryResult } from "@shared/types";
import ResultViewer from "../results/ResultViewer";

interface QueryTabProps {
    tab: Tab;
}


const QueryTab: React.FC<QueryTabProps> = ({ tab }) => {
    const { updateTabContent, setQueryResult, queryResults, activeConnectionId, connections, addTab, theme } = useAppStore();
    const [isRunning, setIsRunning] = useState(false);
    const conn = connections.find(c => c.id === activeConnectionId);
    const editorLanguage = conn?.type === "mongodb" ? "json" : "sql";
    const result = queryResults[tab.id];

    const handleRun = async () => {
        if (!activeConnectionId) {
            alert("Please select a connection first");
            return;
        }

        setIsRunning(true);
        try {
            // For MongoDB, ensure the query is a valid JSON if it's supposed to be
            let queryToSend = tab.content || "";
            if (conn?.type === 'mongodb') {
                try {
                    JSON.parse(queryToSend);
                } catch (e) {
                    throw new Error("Invalid JSON format for MongoDB query.");
                }
            }

            const res = await window.electronAPI.executeQuery(activeConnectionId, queryToSend);
            setQueryResult(tab.id, res);
        } catch (error: any) {
            setQueryResult(tab.id, { type: "error", message: error.message });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                    {isRunning ? (
                        <>
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Running...
                        </>
                    ) : (
                        <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Run Query
                        </>
                    )}
                </button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                <button
                    onClick={() => {
                        const tab = createNewQueryTab(activeConnectionId || undefined, conn?.type);
                        addTab(tab);
                    }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                    title="New Query Tab"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] uppercase font-bold tracking-tight text-slate-400 dark:text-slate-500">Ctrl+Enter to execute</span>
                {result && result.type === "table" && (
                    <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                        <span className="text-green-600 dark:text-green-400">{result.rows.length} rows</span>
                    </div>
                )}
                {result && result.type === "document" && (
                    <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                        <span className="text-blue-600 dark:text-blue-400">{result.rows.length} documents</span>
                    </div>
                )}
            </div>

            {/* Editor & Results split */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Monaco Editor */}
                <div className="flex-1 overflow-hidden min-h-[120px]" style={{ flexBasis: result ? "40%" : "100%" }}>
                    <Editor
                        height="100%"
                        defaultLanguage={editorLanguage}
                        value={tab.content ?? "-- Write your SQL query here\nSELECT 1;"}
                        onChange={(value) => updateTabContent(tab.id, value ?? "")}
                        onMount={(editor, monaco) => {
                            editor.addCommand(
                                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                                handleRun
                            );
                        }}
                        theme={theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'vs-dark' : 'light'}
                        options={{
                            fontSize: 13,
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                            fontLigatures: true,
                            minimap: { enabled: false },
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            wordWrap: "on",
                            padding: { top: 12, bottom: 12 },
                            renderLineHighlight: "all",
                            scrollbar: {
                                verticalScrollbarSize: 6,
                                horizontalScrollbarSize: 6,
                            },
                        }}
                    />
                </div>

                {/* Results Panel */}
                {result && (
                    <div className="flex flex-col border-t border-slate-200 dark:border-slate-800 overflow-hidden" style={{ flexBasis: "60%" }}>
                        <ResultViewer result={result} dbType={conn?.type} />
                    </div>
                )}
            </div>
        </div >
    );
};

export default QueryTab;
