import React from "react";
import { useAppStore } from "../store/useAppStore";
import WelcomeTab from "./tabs/WelcomeTab";
import QueryTab from "./tabs/QueryTab";
import TableViewerTab from "./tabs/TableViewerTab";

const TabArea: React.FC = () => {
    const { tabs, activeTabId } = useAppStore();
    const activeTab = tabs.find((t) => t.id === activeTabId);

    if (!activeTab) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300">
                <div className="text-center group cursor-default">
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-all duration-300 shadow-sm dark:shadow-none">
                        <svg className="w-8 h-8 text-slate-300 dark:text-slate-700 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                    </div>
                    <p className="text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">Select a table or open a query to begin</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-300">
            {activeTab.type === "welcome" && <WelcomeTab />}
            {activeTab.type === "query" && <QueryTab tab={activeTab} />}
            {activeTab.type === "table-viewer" && <TableViewerTab tab={activeTab} />}
        </div>
    );
};

export default TabArea;
