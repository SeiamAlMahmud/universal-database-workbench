import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { QueryResult } from '@shared/types';

interface ResultViewerProps {
    result: QueryResult;
}

type ViewMode = 'table' | 'json';

const ResultViewer: React.FC<ResultViewerProps> = ({ result }) => {
    const [pageSize, setPageSize] = useState(20);
    const [globalFilter, setGlobalFilter] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>(result.type === 'table' ? 'table' : 'table');

    // Copy cell content to clipboard
    const copyToClipboard = (text: string) => {
        if (!text || text === 'null' || text === 'undefined') return;
        navigator.clipboard.writeText(text);
    };

    // Helper to flatten/stringify objects for table cells
    const formatCellValue = (val: any): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
            try {
                return JSON.stringify(val);
            } catch (e) {
                return '[Complex Object]';
            }
        }
        return String(val);
    };

    // Export to CSV
    const exportToCSV = (data: any[], cols: string[]) => {
        if (!data || !cols) return;
        const headers = cols.join(',');
        const rows = data.map(row =>
            cols.map(col => {
                const val = formatCellValue(row[col]);
                return `"${val.replace(/"/g, '""')}"`;
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
    const { tableData, tableColumns } = useMemo(() => {
        let data: any[] = [];
        let cols: string[] = [];

        if (result.type === 'table') {
            data = result.rows || [];
            cols = result.columns || [];
        } else if (result.type === 'document') {
            data = (result as any).rows || [];
            if (data.length > 0) {
                // Extract all unique keys from the first 10 documents to define columns
                const keySet = new Set<string>();
                data.slice(0, 10).forEach(doc => {
                    Object.keys(doc).forEach(key => keySet.add(key));
                });
                cols = Array.from(keySet);
            }
        }

        return { tableData: data, tableColumns: cols };
    }, [result]);

    const columnHelper = createColumnHelper<any>();
    const columns = useMemo(() =>
        tableColumns.map(col =>
            columnHelper.accessor(col, {
                header: col,
                cell: info => {
                    const value = info.getValue();
                    const displayValue = formatCellValue(value);
                    return (
                        <div
                            className="px-3 py-2 truncate max-w-[300px] group relative cursor-pointer hover:bg-blue-500/10 transition-colors font-mono text-[11px]"
                            onClick={() => copyToClipboard(displayValue)}
                            title={displayValue}
                        >
                            {displayValue}
                            {displayValue && (
                                <span className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-[9px] text-blue-400 font-bold bg-slate-900 px-1 border border-blue-500/20 rounded shadow-sm">
                                    COPY
                                </span>
                            )}
                        </div>
                    );
                },
            })
        )
        , [tableColumns]);

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
            <div className="p-8 flex flex-col items-center justify-center h-full bg-slate-950 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 animate-pulse text-2xl">
                    ⚠️
                </div>
                <h3 className="text-lg font-bold text-red-400 mb-2 uppercase tracking-widest font-mono">Execution Error</h3>
                <p className="text-sm text-slate-500 max-w-md leading-relaxed font-mono bg-red-500/5 p-4 rounded-lg border border-red-500/10">
                    {result.message || "An unknown error occurred during query execution."}
                </p>
            </div>
        );
    }

    if (result.type === 'text') {
        return (
            <div className="p-6 overflow-auto bg-slate-950 h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-800 text-2xl shadow-inner shadow-blue-500/10">
                    💡
                </div>
                <p className="text-sm text-slate-300 font-medium whitespace-pre-wrap max-w-lg leading-relaxed">
                    {(result as any).message || "Query executed successfully."}
                </p>
            </div>
        );
    }

    if (tableData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 italic text-sm gap-4 bg-slate-950/50">
                <div className="text-4xl opacity-20">📂</div>
                <p>No documents found in this result set.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-950 border-t border-slate-800/50">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    {/* View Switcher */}
                    <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 shadow-inner">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            TABLE
                        </button>
                        <button
                            onClick={() => setViewMode('json')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'json' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                            JSON
                        </button>
                    </div>

                    <div className="h-4 w-[1px] bg-slate-800 mx-2" />

                    {/* Global Search */}
                    <div className="relative group">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Filter data..."
                            className="bg-slate-800/50 border border-slate-700/50 rounded-lg pl-8 pr-3 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all w-48 font-medium placeholder:text-slate-600"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        <span>Items: <span className="text-slate-300">{table.getFilteredRowModel().rows.length}</span></span>
                        <select
                            value={pageSize}
                            onChange={e => {
                                const newSize = Number(e.target.value);
                                setPageSize(newSize);
                                table.setPageSize(newSize);
                            }}
                            className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none hover:border-slate-600 transition-colors"
                        >
                            {[20, 50, 100, 500].map(size => (
                                <option key={size} value={size}>{size} / page</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => exportToCSV(tableData, tableColumns)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition-all border border-slate-700 shadow-sm"
                    >
                        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        CSV
                    </button>
                </div>
            </div>

            {/* Results Grid / JSON View */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'table' ? (
                    <div className="h-full overflow-auto custom-scrollbar bg-slate-950">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap bg-slate-900/90 backdrop-blur-sm shadow-sm">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-slate-800/30">
                                {table.getRowModel().rows.length > 0 ? (
                                    table.getRowModel().rows.map(row => (
                                        <tr key={row.id} className="hover:bg-blue-500/[0.03] transition-colors group">
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
                ) : (
                    <div className="h-full overflow-auto custom-scrollbar p-0 bg-slate-950 font-mono text-[11px]">
                        <div className="p-4 bg-slate-950">
                            <pre className="text-blue-300 leading-relaxed whitespace-pre-wrap">
                                {JSON.stringify(globalFilter ? table.getFilteredRowModel().rows.map(r => r.original) : tableData, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Pagination */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-200 disabled:opacity-20 transition-all font-bold"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                    </button>
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-200 disabled:opacity-20 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <span className="text-[10px] font-black text-blue-500">PAGE</span>
                        <span className="text-[10px] font-bold text-slate-200">{table.getState().pagination.pageIndex + 1}</span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">OF</span>
                        <span className="text-[10px] font-bold text-slate-200">{table.getPageCount()}</span>
                    </div>

                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-200 disabled:opacity-20 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-200 disabled:opacity-20 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                    </button>
                </div>

                <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Interactive Grid Ready
                </div>
            </div>
        </div>
    );
};

export default ResultViewer;
