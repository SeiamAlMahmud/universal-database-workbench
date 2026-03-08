import React, { useEffect, useState, useMemo, useRef } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Tab } from "@shared/types";
import ResultViewer from "../results/ResultViewer";
import { DATABASE_CAPABILITIES, isDocumentDatabase } from "../../lib/databaseCapabilities";

interface TableViewerTabProps {
    tab: Tab;
}

const TableViewerTab: React.FC<TableViewerTabProps> = ({ tab }) => {
    const { queryResults, setQueryResult, connections } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [filter, setFilter] = useState("{}");
    const [project, setProject] = useState("");
    const [sort, setSort] = useState("");
    const [skip, setSkip] = useState(0);
    const [limit, setLimit] = useState(20);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const conn = connections.find(c => c.id === tab.connectionId);
    const result = queryResults[tab.id];
    const connectionType = conn?.type;
    const isDocumentDb = isDocumentDatabase(connectionType);
    const connectionLabel = connectionType ? DATABASE_CAPABILITIES[connectionType].label : "Unknown DB";

    const OPERATORS = [
        '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
        '$in', '$nin', '$exists', '$type', '$regex',
        '$and', '$or', '$not', '$nor', '$where',
        '$elemMatch', '$size', '$all'
    ];

    // Extract field names from results for autocomplete
    const fieldNames = useMemo(() => {
        if (!isDocumentDb || !result || result.type !== 'document' || !result.rows) return [];
        const keys = new Set<string>();
        (result.rows as any[]).slice(0, 10).forEach(doc => {
            Object.keys(doc).forEach(k => keys.add(k));
        });
        return Array.from(keys);
    }, [isDocumentDb, result]);

    const fetchData = async () => {
        if (!tab.connectionId || !tab.tableName) return;

        setIsLoading(true);
        try {
            let query = "";
            if (connectionType === 'mongodb') {
                const queryPayload: any = {
                    mode: "find",
                    database: tab.databaseName || "test",
                    collection: tab.tableName || "",
                    filter: JSON.parse(filter || "{}"),
                    limit: limit > 0 ? limit : 20,
                    skip: skip > 0 ? skip : 0
                };

                if (project) queryPayload.project = JSON.parse(project);
                if (sort) queryPayload.sort = JSON.parse(sort);

                query = JSON.stringify(queryPayload);
            } else {
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

    // Smart key handling: auto-close brackets/quotes
    const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = inputRef.current;
        if (!input) return;

        const { value, selectionStart } = input;
        const cursor = selectionStart ?? value.length;

        if (showSuggestions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion(prev => Math.max(prev - 1, 0));
                return;
            }
            if (e.key === 'Tab' || e.key === 'Enter') {
                if (suggestions.length > 0) {
                    e.preventDefault();
                    applySuggestion(suggestions[activeSuggestion]);
                    return;
                }
            }
            if (e.key === 'Escape') {
                setShowSuggestions(false);
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            fetchData();
            return;
        }

        const pairs: Record<string, string> = { '{': '}', '[': ']', '"': '"' };
        const closers = new Set(['}', ']', '"']);

        if (pairs[e.key]) {
            e.preventDefault();
            const char = e.key;
            const close = pairs[char];
            // If next char is already the closer, skip
            if (value[cursor] === close && char === close) {
                const newVal = value;
                setFilter(newVal);
                requestAnimationFrame(() => {
                    input.setSelectionRange(cursor + 1, cursor + 1);
                });
            } else {
                const newVal = value.slice(0, cursor) + char + close + value.slice(cursor);
                setFilter(newVal);
                requestAnimationFrame(() => {
                    input.setSelectionRange(cursor + 1, cursor + 1);
                });
            }
            return;
        }

        // Skip over auto-inserted closing chars
        if (closers.has(e.key) && value[cursor] === e.key) {
            e.preventDefault();
            requestAnimationFrame(() => {
                input.setSelectionRange(cursor + 1, cursor + 1);
            });
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFilter(val);

        // Compute autocomplete suggestions
        const cursor = e.target.selectionStart ?? val.length;
        const before = val.slice(0, cursor);
        const wordMatch = before.match(/["']?([\w$]*)$/);
        const word = wordMatch ? wordMatch[1] : '';

        if (word.length >= 1) {
            const fieldMatches = fieldNames.filter(f => f.toLowerCase().startsWith(word.toLowerCase()));
            const opMatches = OPERATORS.filter(op => op.startsWith(word));
            const combined = [...fieldMatches, ...opMatches].slice(0, 8);
            setSuggestions(combined);
            setShowSuggestions(combined.length > 0);
            setActiveSuggestion(0);
        } else {
            setShowSuggestions(false);
        }
    };

    const applySuggestion = (sug: string) => {
        const input = inputRef.current;
        if (!input) return;
        const cursor = input.selectionStart ?? filter.length;
        const before = filter.slice(0, cursor);
        const after = filter.slice(cursor);
        // Replace the current partial word
        const replaced = before.replace(/["']?([\w$]*)$/, `"${sug}"`);
        const newVal = replaced + after;
        setFilter(newVal);
        setShowSuggestions(false);
        requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(replaced.length, replaced.length);
        });
    };

    const QueryInput = ({ value, onChange, placeholder }: any) => (
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 flex items-center gap-2 group focus-within:border-emerald-500/50 transition-all">
            <span className="text-[10px] text-slate-400 font-bold shrink-0">{placeholder}</span>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                className="bg-transparent border-none outline-none text-[11px] font-mono text-slate-700 dark:text-slate-200 w-full"
                placeholder="{}"
            />
        </div>
    );

    if (connectionType !== 'mongodb') {
        return (
            <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-slate-900/50 transition-colors duration-300">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📊</span>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                {tab.databaseName ? `${tab.databaseName}.${tab.tableName}` : tab.tableName}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-mono font-bold tracking-tight">Table Viewer - {connectionLabel}</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    {result && <ResultViewer result={result} dbType={connectionType} />}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300">
            {/* Table Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-lg">📊</span>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {tab.databaseName ? `${tab.databaseName}.${tab.tableName}` : tab.tableName}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-mono font-bold tracking-tight">Collection Viewer - MongoDB</p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    disabled={isLoading}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/5 text-slate-400 hover:text-blue-500 dark:hover:text-slate-100 transition-colors disabled:opacity-50"
                    title="Refresh Data"
                >
                    <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* MongoDB Query Bar - Compass Style */}
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-20">
                <div className="flex items-center gap-2">
                    {/* Filter Input */}
                    <div className="relative flex-1">
                        <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all shadow-inner">
                            <span className="pl-3 pr-1 text-slate-400 shrink-0 text-sm select-none">{ }</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={filter}
                                onChange={handleFilterChange}
                                onKeyDown={handleFilterKeyDown}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                spellCheck={false}
                                className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono text-slate-800 dark:text-slate-100 py-2 px-1 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                placeholder="{ field: 'value', $or: [...] }"
                            />
                        </div>

                        {/* Autocomplete dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                {suggestions.map((sug, i) => (
                                    <button
                                        key={sug}
                                        onMouseDown={() => applySuggestion(sug)}
                                        className={`w-full text-left px-3 py-1.5 text-[11px] font-mono flex items-center gap-2 transition-colors ${i === activeSuggestion ? 'bg-blue-500 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    >
                                        <span className={`text-[9px] font-bold shrink-0 ${i === activeSuggestion ? 'text-blue-200' : (sug.startsWith('$') ? 'text-orange-500' : 'text-slate-400')}`}>
                                            {sug.startsWith('$') ? 'OP' : 'FLD'}
                                        </span>
                                        {sug}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <button
                        onClick={() => { setFilter("{}"); setProject(""); setSort(""); }}
                        className="px-2 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all active:scale-95"
                    >
                        {isLoading ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : "Find"}
                    </button>
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold transition-colors rounded-lg ${showOptions ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        Options
                        <svg className={`w-3 h-3 transition-transform ${showOptions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* Advanced Options Drawer */}
                {showOptions && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="space-y-2">
                            <QueryInput placeholder="PROJECT" value={project} onChange={setProject} />
                            <QueryInput placeholder="SORT" value={sort} onChange={setSort} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Skip</span>
                                <input type="number" value={skip} onChange={e => setSkip(parseInt(e.target.value) || 0)} className="w-full bg-transparent border-none outline-none text-[11px] font-mono text-slate-700 dark:text-slate-200" />
                            </div>
                            <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Limit</span>
                                <input type="number" value={limit} onChange={e => setLimit(parseInt(e.target.value) || 20)} className="w-full bg-transparent border-none outline-none text-[11px] font-mono text-slate-700 dark:text-slate-200" />
                            </div>
                            <div className="col-span-2 text-[9px] text-slate-400 dark:text-slate-600 font-mono italic">
                                Use JSON for PROJECT/SORT · Enter or Find to run
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {isLoading && !result && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-slate-950/40 backdrop-blur-sm z-10">
                        <div className="flex flex-col items-center gap-3">
                            <svg className="w-8 h-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading...</span>
                        </div>
                    </div>
                )}

                {result && (
                    <div className="h-full flex flex-col">
                        <ResultViewer result={result} hideFilter={true} dbType={connectionType} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TableViewerTab;
