import React from "react";
import { useAppStore } from "../store/useAppStore";
import { Tab } from "@shared/types";

const TAB_ICONS: Record<Tab["type"], React.ReactNode> = {
    query: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 9l3 3-3 3m5 0h3" />
        </svg>
    ),
    table: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h18M3 14h18M10 4v16M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
    ),
    schema: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7" />
        </svg>
    ),
    welcome: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    ),
};

const TabBar: React.FC = () => {
    const { tabs, activeTabId, setActiveTab, removeTab } = useAppStore();

    return (
        <div
            className="flex items-end overflow-x-auto bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0 custom-scrollbar"
            style={{ height: "var(--tab-bar-height)" }}
        >
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    className={`group flex items-center gap-2 px-4 h-[34px] cursor-pointer text-xs font-bold transition-all border-r border-slate-200 dark:border-slate-800 select-none relative
                        ${activeTabId === tab.id
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            : "bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-900/50 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.title}
                >
                    {activeTabId === tab.id && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                    )}
                    <span className={activeTabId === tab.id ? "text-blue-500 dark:text-blue-400" : "text-slate-400 dark:text-slate-600"}>
                        {TAB_ICONS[tab.type]}
                    </span>
                    <span className="max-w-[120px] truncate">{tab.title}</span>
                    {tab.isDirty && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.3)]" title="Unsaved changes" />
                    )}
                    {tab.id !== "welcome" && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTab(tab.id);
                            }}
                            className={`w-4 h-4 flex items-center justify-center rounded transition-all shrink-0 ml-1
                                ${activeTabId === tab.id ? "opacity-100 hover:bg-slate-100 dark:hover:bg-white/10" : "opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-white/10"}
                                text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400`}
                            title="Close tab"
                        >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

export default TabBar;
