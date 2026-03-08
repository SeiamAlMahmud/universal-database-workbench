import React, { useCallback, useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import TabBar from "./components/TabBar";
import TabArea from "./components/TabArea";
import { useAppStore, createNewQueryTab } from "./store/useAppStore";

const App: React.FC = () => {
    const { sidebarWidth, isSidebarCollapsed, addTab, loadSavedConnections, theme } = useAppStore();

    useEffect(() => {
        loadSavedConnections();
    }, [loadSavedConnections]);

    // Theme Management
    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = (t: string) => {
            root.classList.remove('light', 'dark');
            if (t === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.classList.add(systemTheme);
            } else {
                root.classList.add(t);
            }
        };

        applyTheme(theme);

        // Listen for system theme changes if set to 'system'
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

        return undefined;
    }, [theme]);

    const handleNewQuery = useCallback(() => {
        addTab(createNewQueryTab());
    }, [addTab]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "t") {
                e.preventDefault();
                handleNewQuery();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [handleNewQuery]);

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 overflow-hidden transition-colors duration-300">
            {/* Top header bar */}
            <Header onNewQuery={handleNewQuery} />

            {/* Main content: sidebar + editor area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                {!isSidebarCollapsed && (
                    <Sidebar width={sidebarWidth} />
                )}

                {/* Editor + tabs area */}
                <div className="flex flex-col flex-1 overflow-hidden">
                    <TabBar />
                    <TabArea />
                </div>
            </div>

            {/* Status bar */}
            <div
                className="flex items-center justify-between px-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-black text-[10px] text-slate-500 dark:text-slate-500 select-none shrink-0"
                style={{ height: "var(--status-bar-height)" }}
            >
                <div className="flex items-center gap-3">
                    <span className="font-bold uppercase tracking-wider">DB Workbench v1.0.0</span>
                </div>
                <div className="flex items-center gap-3 font-medium">
                    <span>
                        <a
                            href="https://github.com/SeiamAlMahmud"
                            className="text-gray-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-500 cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault();
                                window.electronAPI.openExternal("https://github.com/SeiamAlMahmud");
                            }}
                        >
                            Seiam Al Mahmud
                        </a>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default App;
