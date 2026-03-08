import React, { useState, useMemo, useEffect } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { DatabaseType, QueryResult } from '@shared/types';
import { isDocumentDatabase } from '../../lib/databaseCapabilities';

interface ResultViewerProps {
    result: QueryResult;
    hideFilter?: boolean;
    dbType?: DatabaseType;
}

type ViewMode = 'table-viewer' | 'json' | 'list';

const ResultViewer: React.FC<ResultViewerProps> = ({ result, hideFilter = false, dbType }) => {
    const [pageSize, setPageSize] = useState(20);
    const [globalFilter, setGlobalFilter] = useState('');
    const isDocumentDb = isDocumentDatabase(dbType);
    const isDocumentResult = result.type === 'document';
    const isTableResult = result.type === 'table';
    const allowListView = isDocumentResult || isTableResult;
    const filterLabel = isDocumentDb && isDocumentResult ? 'documents' : 'rows';
    const itemLabel = isDocumentDb && isDocumentResult ? 'Documents' : 'Rows';

    // Default to 'list' for documents (user request), Table for SQL
    const [viewMode, setViewMode] = useState<ViewMode>(isDocumentResult ? 'list' : 'table-viewer');

    useEffect(() => {
        setViewMode((prev) => {
            if (!allowListView && prev === 'list') {
                return 'table-viewer';
            }
            if (isDocumentResult && prev === 'table-viewer') {
                return 'list';
            }
            if (!isDocumentResult && isTableResult && prev === 'list') {
                return 'table-viewer';
            }
            return prev;
        });
    }, [allowListView, isDocumentResult, isTableResult, result.type]);

    // Recursively clean up MongoDB BSON artifacts (like buffer-based ObjectIds)
    const transformData = (val: any): any => {
        if (val === null || val === undefined) return val;

        if (Array.isArray(val)) {
            return val.map(transformData);
        }

        if (typeof val === 'object') {
            // Handle Date objects
            if (val instanceof Date) return val.toISOString();

            // Handle MongoDB $date
            if (val.$date) {
                const d = typeof val.$date === 'string' ? val.$date : (val.$date.$numberLong ? new Date(parseInt(val.$date.$numberLong)).toISOString() : val.$date);
                return typeof d === 'string' ? d : new Date(d).toISOString();
            }

            // Check for serialized ObjectId buffer pattern: { buffer: { "0": 105, ... } }
            if (val.buffer && typeof val.buffer === 'object') {
                const keys = Object.keys(val.buffer);
                // ObjectId is 12 bytes
                if (keys.length === 12 && keys.every(k => !isNaN(Number(k)))) {
                    return Object.values(val.buffer)
                        .map((b: any) => b.toString(16).padStart(2, '0'))
                        .join('');
                }
            }

            // Check for standard $oid
            if (val.$oid) return val.$oid;

            // Otherwise, recurse into the object
            const cleaned: any = {};
            for (const key in val) {
                cleaned[key] = transformData(val[key]);
            }
            return cleaned;
        }

        return val;
    };

    // Copy cell content to clipboard
    const copyToClipboard = (text: string) => {
        if (!text || text === 'null' || text === 'undefined') return;
        navigator.clipboard.writeText(text);
    };

    // Helper to detect MongoDB data types and format them like Compass
    const detectTypeAndValue = (val: any): { type: string, display: string, raw: string } => {
        if (val === null || val === undefined) return { type: 'Null', display: 'null', raw: 'null' };

        // If it's a 24-char hex string, it's likely an ObjectId we transformed
        if (typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val)) {
            return { type: 'ObjectId', display: `ObjectId('${val}')`, raw: val };
        }

        if (typeof val === 'object') {
            if (val instanceof Date) {
                const iso = val.toISOString();
                return { type: 'Date', display: iso, raw: iso };
            }

            // If it's a string that looks like a date (from transformData)
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
                return { type: 'Date', display: val, raw: val };
            }

            try {
                const str = JSON.stringify(val);
                if (str === '{}' && Object.keys(val).length > 0) {
                    return { type: 'Object', display: '{...}', raw: '{...}' };
                }
                return { type: 'Object', display: str, raw: str };
            } catch (e) {
                return { type: 'Object', display: '{...}', raw: '{}' };
            }
        }

        if (typeof val === 'string') return { type: 'String', display: `"${val}"`, raw: val };
        if (typeof val === 'number') return { type: Number.isInteger(val) ? 'Int32' : 'Double', display: String(val), raw: String(val) };
        if (typeof val === 'boolean') return { type: 'Boolean', display: String(val), raw: String(val) };

        return { type: typeof val, display: String(val), raw: String(val) };
    };

    // Export to CSV
    const exportToCSV = (data: any[], cols: string[]) => {
        if (!data || !cols) return;
        const headers = cols.join(',');
        const rows = data.map(row =>
            cols.map(col => {
                const { raw } = detectTypeAndValue(row[col]);
                return `"${raw.replace(/"/g, '""')}"`;
            }).join(',')
        );

        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `export_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Prepare data and columns for TanStack Table
    const { tableData, tableColumns, columnProbableTypes } = useMemo(() => {
        let rawData: any[] = [];
        let cols: string[] = [];
        let types: Record<string, string> = {};

        if (result.type === 'table') {
            rawData = result.rows || [];
            cols = result.columns || [];
        } else if (result.type === 'document') {
            rawData = (result as any).rows || [];
            if (rawData.length > 0) {
                const keySet = new Set<string>();
                rawData.slice(0, 10).forEach(doc => {
                    Object.keys(doc).forEach(key => keySet.add(key));
                });
                cols = Array.from(keySet);
            }
        }

        // Apply recursive cleanup transformation
        const data = transformData(rawData);

        // Determine probable types for headers based on first 10 docs
        if (result.type === 'document' && data.length > 0) {
            data.slice(0, 10).forEach((doc: any) => {
                cols.forEach(col => {
                    if (!types[col] && doc[col] !== undefined && doc[col] !== null) {
                        types[col] = detectTypeAndValue(doc[col]).type;
                    }
                });
            });
        }

        return { tableData: data, tableColumns: cols, columnProbableTypes: types };
    }, [result]);

    const columnHelper = createColumnHelper<any>();
    const columns = useMemo(() =>
        tableColumns.map(col =>
            columnHelper.accessor(col, {
                header: () => (
                    <div className="flex flex-col items-start gap-0.5 py-1">
                        <span className="text-slate-800 dark:text-slate-200 font-bold">{col}</span>
                        {columnProbableTypes[col] && (
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono italic">{columnProbableTypes[col]}</span>
                        )}
                    </div>
                ),
                cell: info => {
                    const value = info.getValue();
                    const { type, display, raw } = detectTypeAndValue(value);
                    return (
                        <div
                            className="px-3 py-2 truncate max-w-[300px] group/cell relative cursor-pointer hover:bg-emerald-500/5 transition-colors font-mono text-[11px]"
                            onClick={() => copyToClipboard(raw)}
                            title={display}
                        >
                            <span className={
                                type === 'String' ? 'text-emerald-600 dark:text-emerald-400' :
                                    type === 'ObjectId' ? 'text-orange-600 dark:text-orange-400' :
                                        type === 'Int32' || type === 'Double' ? 'text-blue-600 dark:text-sky-400' :
                                            type === 'Boolean' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'
                            }>
                                {display}
                            </span>
                            {raw && (
                                <span className="absolute right-1 top-1 opacity-0 group-hover/cell:opacity-100 text-[8px] text-emerald-400 font-bold bg-slate-900 px-1 border border-emerald-500/20 rounded shadow-sm">
                                    COPY
                                </span>
                            )}
                        </div>
                    );
                },
            })
        )
        , [tableColumns, columnProbableTypes]);

    const table = useReactTable({
        data: tableData,
        columns,
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        initialState: {
            pagination: {
                pageSize: pageSize,
            },
        },
    });

    if (result.type === 'error') {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full bg-white dark:bg-slate-950 text-center transition-colors duration-300">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 animate-pulse text-2xl">
                    ⚠️
                </div>
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2 uppercase tracking-widest font-mono">Execution Error</h3>
                <p className="text-sm text-slate-600 dark:text-slate-500 max-w-md leading-relaxed font-mono bg-red-500/5 p-4 rounded-lg border border-red-500/10">
                    {result.message || "An unknown error occurred during query execution."}
                </p>
            </div>
        );
    }

    if (result.type === 'text') {
        return (
            <div className="p-6 overflow-auto bg-white dark:bg-slate-950 h-full flex flex-col items-center justify-center text-center transition-colors duration-300">
                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-800 text-2xl shadow-inner dark:shadow-blue-500/10">
                    💡
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap max-w-lg leading-relaxed">
                    {(result as any).content || (result as any).message || "Query executed successfully."}
                </p>
            </div>
        );
    }

    if (tableData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 italic text-sm gap-4 bg-slate-50 dark:bg-slate-950/50 transition-colors duration-300">
                <div className="text-4xl opacity-20">📂</div>
                <p>No {filterLabel} found in this result set.</p>
            </div>
        );
    }

    // Recursive Field Row for List View (Compass Style)
    const FieldRow: React.FC<{
        label: string;
        value: any;
        depth: number;
        path: string;
    }> = ({ label, value, depth, path }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const { type, display, raw } = detectTypeAndValue(value);
        const isExpandable = (type === 'Object' || type === 'Array') && value !== null;

        // Truncate long strings for responsiveness
        const truncateText = (text: string, limit: number = 200) => {
            if (text.length <= limit) return text;
            return text.substring(0, limit) + '...';
        };

        const renderValue = () => {
            if (isExpandable) {
                if (!isExpanded) {
                    const count = type === 'Array' ? value.length : Object.keys(value).length;
                    return (
                        <span className="text-slate-400 italic">
                            {type === 'Array' ? `Array (${count})` : `Object {${count} fields}`}
                        </span>
                    );
                }

                return (
                    <div className="mt-1 space-y-1 border-l border-slate-200 dark:border-slate-800 ml-1 pl-3">
                        {type === 'Array'
                            ? value.map((item: any, i: number) => (
                                <FieldRow
                                    key={`${path}.${i}`}
                                    label={i.toString()}
                                    value={item}
                                    depth={depth + 1}
                                    path={`${path}.${i}`}
                                />
                            ))
                            : Object.entries(value).map(([k, v]) => (
                                <FieldRow
                                    key={`${path}.${k}`}
                                    label={k}
                                    value={v}
                                    depth={depth + 1}
                                    path={`${path}.${k}`}
                                />
                            ))}
                    </div>
                );
            }

            return (
                <div
                    className="flex items-center gap-2 group/val cursor-pointer overflow-hidden"
                    onClick={() => copyToClipboard(raw)}
                >
                    <span className={`break-all ${type === 'String' ? 'text-emerald-600 dark:text-emerald-400' :
                        type === 'ObjectId' ? 'text-orange-600 dark:text-orange-400 font-bold' :
                            type === 'Int32' || type === 'Double' ? 'text-blue-600 dark:text-sky-400 font-bold' :
                                type === 'Boolean' ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                        {truncateText(display)}
                    </span>
                    <span className="opacity-0 group-hover/val:opacity-100 text-[8px] text-blue-500 font-bold uppercase shrink-0">Copy</span>
                </div>
            );
        };

        return (
            <div className={`py-0.5 ${depth === 0 ? 'border-b border-slate-100 dark:border-slate-800/20 last:border-0 pb-2' : ''}`}>
                <div className="flex items-start gap-2 group/field overflow-hidden">
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {isExpandable ? (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-400"
                            >
                                <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ) : (
                            <div className="w-4" />
                        )}
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={label}>{label}</span>
                        <span className="text-[9px] text-slate-300 dark:text-slate-600 font-mono tracking-tighter shrink-0">{type}</span>
                    </div>
                    <div className="flex-1 min-w-0 text-[11px] font-mono">
                        {renderValue()}
                    </div>
                </div>
            </div>
        );
    };

    // LIST VIEW RENDERER
    const renderListView = () => {
        const rows = globalFilter ? table.getFilteredRowModel().rows : table.getRowModel().rows;

        return (
            <div className="h-full overflow-auto custom-scrollbar p-3 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
                <div className="max-w-5xl mx-auto space-y-4">
                    {rows.map((row, idx) => {
                        const doc = row.original;
                        return (
                            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                        Document {idx + 1 + table.getState().pagination.pageIndex * pageSize}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => copyToClipboard(JSON.stringify(doc, null, 2))}
                                            className="text-[9px] font-bold text-blue-500 uppercase p-1 hover:bg-blue-500/10 rounded transition-colors"
                                        >
                                            Copy JSON
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 space-y-1">
                                    {Object.entries(doc).map(([key, val]) => (
                                        <FieldRow
                                            key={key}
                                            label={key}
                                            value={val}
                                            depth={0}
                                            path={`${idx}.${key}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {rows.length === 0 && (
                    <div className="py-20 text-center text-slate-400 italic text-sm font-medium uppercase tracking-widest">No matching {filterLabel} found.</div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/50 transition-colors duration-300">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    {/* View Switcher - Compass Style */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-inner">
                        {allowListView && (
                            <button
                                onClick={() => setViewMode('list')}
                                title="List View"
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={() => setViewMode('json')}
                            title="JSON View"
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'json' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('table-viewer')}
                            title="Table View"
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'table-viewer' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>

                    {!hideFilter && (
                        <>
                            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />
                            <div className="relative group">
                                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={globalFilter ?? ''}
                                    onChange={e => setGlobalFilter(e.target.value)}
                                    placeholder={`Filter ${filterLabel}...`}
                                    className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg pl-8 pr-3 py-1 text-[11px] text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all w-64 font-bold tracking-tight placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors duration-300"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                        <span>{itemLabel}: <span className="text-slate-700 dark:text-slate-300">{table.getFilteredRowModel().rows.length}</span></span>
                        <select
                            value={pageSize}
                            onChange={e => {
                                const newSize = Number(e.target.value);
                                setPageSize(newSize);
                                table.setPageSize(newSize);
                            }}
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300 focus:outline-none hover:border-slate-400 dark:hover:border-slate-600 transition-all font-bold"
                        >
                            {[20, 50, 100, 500].map(size => (
                                <option key={size} value={size}>{size} / page</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => exportToCSV(tableData, tableColumns)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95"
                    >
                        <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        CSV
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'table-viewer' ? (
                    <div className="h-full overflow-auto custom-scrollbar bg-white dark:bg-slate-950 transition-colors duration-300">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                                {table.getRowModel().rows.length > 0 ? (
                                    table.getRowModel().rows.map(row => (
                                        <tr key={row.id} className="hover:bg-emerald-500/[0.02] transition-colors">
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id} className="border-r border-slate-800/10 last:border-r-0">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={tableColumns.length} className="px-6 py-20 text-center text-slate-600 italic text-sm">
                                            No matches found for your filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : viewMode === 'list' && allowListView ? (
                    renderListView()
                ) : (
                    <div className="h-full overflow-auto custom-scrollbar p-3 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
                        <div className="max-w-5xl mx-auto space-y-4">
                            {(globalFilter ? table.getFilteredRowModel().rows.map((r: any) => r.original) : tableData).map((doc: any, idx: number) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm font-mono text-[11px]">
                                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800/40">
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            {allowListView ? 'Document' : 'Row'} {idx + 1 + table.getState().pagination.pageIndex * pageSize}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(JSON.stringify(doc, null, 2))}
                                            className="text-[9px] font-bold text-blue-500 uppercase px-2 py-1 hover:bg-blue-500/10 rounded transition-colors"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <pre className="text-emerald-600 dark:text-emerald-400 leading-relaxed whitespace-pre-wrap">
                                        {JSON.stringify(doc, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Pagination */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shrink-0 transition-colors duration-300">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-20 transition-all font-bold"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                    </button>
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-20 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-tighter">Page</span>
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{table.getState().pagination.pageIndex + 1}</span>
                        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-tighter mx-1">/</span>
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{table.getPageCount()}</span>
                    </div>

                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-20 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-20 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                    </button>
                </div>

                <div className="text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    Explorer Active ({viewMode.toUpperCase().replace('-VIEWER', '')})
                </div>
            </div>
        </div>
    );
};   

export default ResultViewer;
