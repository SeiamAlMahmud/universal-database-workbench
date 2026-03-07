import React, { useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
} from "@tanstack/react-table";
import { QueryResult } from "@shared/types";

interface ResultGridProps {
    result: QueryResult;
}

const ResultGrid: React.FC<ResultGridProps> = ({ result }) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = React.useState("");

    const columnHelper = createColumnHelper<Record<string, unknown>>();

    const columns = useMemo(
        () =>
            result.columns.map((col) =>
                columnHelper.accessor(col.name, {
                    header: col.name,
                    cell: (info) => {
                        const value = info.getValue();
                        if (value === null || value === undefined) {
                            return <span className="text-slate-600 italic text-xs">NULL</span>;
                        }
                        return String(value);
                    },
                })
            ),
        [result.columns]
    );

    const table = useReactTable({
        data: result.rows,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="flex flex-col h-full">
            {/* Filter bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950 shrink-0">
                <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Filter results..."
                    className="flex-1 bg-transparent text-xs text-slate-300 placeholder:text-slate-600
                     focus:outline-none"
                />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-900">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {/* Row number header */}
                                <th className="w-10 px-2 py-2 text-right text-slate-600 border-b border-r border-slate-800 font-mono select-none bg-slate-900">
                                    #
                                </th>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={`px-3 py-2 text-left font-semibold text-slate-400 border-b border-r border-slate-800
                                whitespace-nowrap bg-slate-900 select-none
                                ${header.column.getCanSort() ? "cursor-pointer hover:text-slate-200 hover:bg-slate-800/50" : ""}`}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {header.column.getIsSorted() === "asc" && (
                                                <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                            )}
                                            {header.column.getIsSorted() === "desc" && (
                                                <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map((row, rowIndex) => (
                            <tr
                                key={row.id}
                                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                            >
                                <td className="px-2 py-1.5 text-right text-slate-600 border-r border-slate-800/50 font-mono select-none w-10">
                                    {rowIndex + 1}
                                </td>
                                {row.getVisibleCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        className="px-3 py-1.5 text-slate-300 border-r border-slate-800/50 whitespace-nowrap font-mono"
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ResultGrid;
