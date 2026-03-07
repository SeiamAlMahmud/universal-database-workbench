import React, { useCallback, useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import TabBar from "./components/TabBar";
import TabArea from "./components/TabArea";
import { useAppStore, createNewQueryTab } from "./store/useAppStore";

const App: React.FC = () => {
    const { sidebarWidth, isSidebarCollapsed, addTab, loadSavedConnections } = useAppStore();

    useEffect(() => {
        loadSavedConnections();
    }, [loadSavedConnections]);

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
        <div className="flex flex-col h-screen bg-slate-900 text-slate-200 overflow-hidden">
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
                className="flex items-center justify-between px-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-600 select-none shrink-0"
                style={{ height: "var(--status-bar-height)" }}
            >
                <div className="flex items-center gap-3">
                    <span>DB Workbench v1.0.0</span>
                </div>
                <div className="flex items-center gap-3">
                    <span>TypeScript · Electron · React</span>
                </div>
            </div>
        </div>
    );
};

export default App;
