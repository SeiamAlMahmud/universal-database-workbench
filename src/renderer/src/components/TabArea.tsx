import React from "react";
import { useAppStore } from "../store/useAppStore";
import WelcomeTab from "./tabs/WelcomeTab";
import QueryTab from "./tabs/QueryTab";

const TabArea: React.FC = () => {
    const { tabs, activeTabId } = useAppStore();
    const activeTab = tabs.find((t) => t.id === activeTabId);

    if (!activeTab) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-900">
                <p className="text-slate-600 text-sm">No tab selected</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab.type === "welcome" && <WelcomeTab />}
            {activeTab.type === "query" && <QueryTab tab={activeTab} />}
            {activeTab.type === "table" && (
                <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-500 text-sm">
                    Table viewer — coming soon
                </div>
            )}
            {activeTab.type === "schema" && (
                <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-500 text-sm">
                    Schema explorer — coming soon
                </div>
            )}
        </div>
    );
};

export default TabArea;
