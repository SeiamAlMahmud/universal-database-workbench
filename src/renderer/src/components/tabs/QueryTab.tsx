import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { useAppStore } from "../../store/useAppStore";
import { Tab, QueryResult } from "@shared/types";
import ResultGrid from "./ResultGrid";

interface QueryTabProps {
    tab: Tab;
}


const QueryTab: React.FC<QueryTabProps> = ({ tab }) => {
    const { updateTabContent, setQueryResult, queryResults, activeConnectionId } = useAppStore();
    const [isRunning, setIsRunning] = useState(false);
    const result = queryResults[tab.id];

    const handleRun = async () => {
        if (!activeConnectionId) {
            alert("Please select a connection first");
            return;
        }

        setIsRunning(true);
        try {
            const res = await window.electronAPI.executeQuery(activeConnectionId, tab.content || "");
            setQueryResult(tab.id, res);
        } catch (error: any) {
            setQueryResult(tab.id, { type: "error", message: error.message });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800 bg-slate-950 shrink-0">
                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="w-px h-4 bg-slate-700" />
                <span className="text-xs text-slate-500">Ctrl+Enter to execute</span>
                {result && result.type === "table" && (
                    <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                        <span className="text-green-400">{result.rows.length} rows</span>
                    </div>
                )}
            </div>

            {/* Editor & Results split */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Monaco Editor */}
                <div className="flex-1 overflow-hidden min-h-[120px]" style={{ flexBasis: result ? "40%" : "100%" }}>
                    <Editor
                        height="100%"
                        defaultLanguage="sql"
                        value={tab.content ?? "-- Write your SQL query here\nSELECT 1;"}
                        onChange={(value) => updateTabContent(tab.id, value ?? "")}
                        onMount={(editor, monaco) => {
                            editor.addCommand(
                                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                                handleRun
                            );
                        }}
                        theme="vs-dark"
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
                    <div className="flex flex-col border-t border-slate-800 overflow-hidden" style={{ flexBasis: "60%" }}>
                        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-slate-800 bg-slate-950 shrink-0">
                            <span className="text-xs font-semibold text-slate-400">Results</span>
                            {result.type === "error" ? (
                                <span className="text-xs text-red-400">{result.message}</span>
                            ) : null}
                        </div>
                        <div className="flex-1 overflow-auto">
                            {result.type === "table" && <ResultGrid result={result} />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QueryTab;
