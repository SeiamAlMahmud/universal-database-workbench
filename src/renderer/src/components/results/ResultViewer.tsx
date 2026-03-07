import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { QueryResult } from '@shared/types';

interface ResultViewerProps {
    result: QueryResult;
}

const ResultViewer: React.FC<ResultViewerProps> = ({ result }) => {
    const [pageSize, setPageSize] = useState(20);

    // Copy cell content to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Simple feedback could be added here (e.g., a toast)
    };

    // Export to CSV
    const exportToCSV = () => {
        if (result.type !== 'table' || !result.columns || !result.rows) return;

        const headers = result.columns.join(',');
        const rows = (result.rows as any[]).map(row =>
            result.columns!.map(col => {
                const val = row[col];
                return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
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

    // 1. Table View Renderer
    const renderTable = () => {
        if (result.type !== 'table' || !result.columns) return null;

        const columnHelper = createColumnHelper<any>();
        const columns = useMemo(() =>
            result.columns!.map(col =>
                columnHelper.accessor(col, {
                    header: col,
                    cell: info => (
                        <div
                            className="px-3 py-2 truncate max-w-[300px] group relative cursor-pointer hover:bg-blue-500/10 transition-colors"
                            onClick={() => copyToClipboard(String(info.getValue()))}
                            title="Click to copy"
                        >
                            {String(info.getValue())}
                            <span className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-[10px] text-blue-400 font-bold bg-slate-800 px-1 rounded">
                                COPY
                            </span>
                        </div>
                    ),
                })
            )
            , [result.columns]);

        const table = useReactTable({
            data: (result.rows as any[]) || [],
            columns,
            getCoreRowModel: getCoreRowModel(),
            getPaginationRowModel: getPaginationRowModel(),
            initialState: {
                pagination: {
                    pageSize: pageSize,
                },
            },
        });

        return (
            <div className="flex flex-col h-full overflow-hidden bg-slate-950">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-500">
                            Showing <span className="text-slate-300 font-bold">{table.getRowModel().rows.length}</span> of <span className="text-slate-300 font-bold">{(result.rows as any[]).length}</span> rows
                        </span>
                        <div className="h-4 w-[1px] bg-slate-800" />
                        <div className="flex items-center gap-2">
                            <span className="text-slate-600">Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={e => {
                                    const newSize = Number(e.target.value);
                                    setPageSize(newSize);
                                    table.setPageSize(newSize);
                                }}
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-[10px] focus:outline-none"
                            >
                                {[10, 20, 50, 100].map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors border border-slate-700"
                    >
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export CSV
                    </button>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="text-sm text-slate-300 border-r border-slate-800/30 last:border-r-0">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                        </span>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono italic">
                        Tip: Click a cell to copy its content.
                    </div>
                </div>
            </div>
        );
    };

    // Main Switcher
    switch (result.type) {
        case 'table':
            return renderTable();
        case 'document': {
            const rows = (result as any).rows; // NoSQL style rows
            return (
                <div className="p-6 overflow-auto bg-slate-950 h-full custom-scrollbar">
                    <pre className="text-xs font-mono text-blue-300 leading-relaxed">
                        {JSON.stringify(rows, null, 2)}
                    </pre>
                </div>
            );
        }
        case 'text': {
            const message = (result as any).message;
            return (
                <div className="p-6 overflow-auto bg-slate-950 h-full custom-scrollbar flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-800">
                        <svg className="w-8 h-8 text-blue-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-sm text-slate-400 font-medium whitespace-pre-wrap max-w-lg">
                        {message || "Query executed successfully with no returned data."}
                    </p>
                </div>
            );
        }
        case 'error': {
            const message = result.message;
            return (
                <div className="p-8 flex flex-col items-center justify-center h-full bg-slate-950 text-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 animate-pulse">
                        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-red-400 mb-2 uppercase tracking-widest">Execution Error</h3>
                    <p className="text-sm text-slate-500 max-w-md leading-relaxed font-mono">
                        {message || "An unknown error occurred during query execution."}
                    </p>
                </div>
            );
        }
        default:
            return (
                <div className="flex items-center justify-center h-full text-slate-700 italic text-sm">
                    No result data available.
                </div>
            );
    }
};

export default ResultViewer;
