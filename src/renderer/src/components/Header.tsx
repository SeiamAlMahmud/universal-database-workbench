import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import murgiLogo from "../assets/murgidb-logo.png";
import { ACCENT_PRESETS, AccentPalette, SyntaxColorKey } from "../lib/theme";

interface HeaderProps {
    onNewQuery: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewQuery }) => {
    const { activeConnectionId, connections, toggleSidebar, theme, setTheme, accentPalette, setAccentPalette, customAccent, setCustomAccent, syntaxColors, setSyntaxColor, applySyntaxPreset } = useAppStore();
    const [showThemePanel, setShowThemePanel] = useState(false);
    const themePanelRef = useRef<HTMLDivElement>(null);
    const activeConnection = connections.find((c) => c.id === activeConnectionId);
    const corePalettes: Exclude<AccentPalette, "custom">[] = ["ocean", "emerald", "rose", "amber", "violet", "slate"];
    const brandPalettes: Exclude<AccentPalette, "custom">[] = ["neon", "mongodb", "postgres"];
    const syntaxItems: Array<{ key: SyntaxColorKey; label: string }> = [
        { key: "string", label: "String" },
        { key: "number", label: "Number" },
        { key: "date", label: "Date" },
        { key: "objectId", label: "ObjectId" },
        { key: "boolean", label: "Boolean" },
        { key: "object", label: "Object" },
        { key: "null", label: "Null" },
    ];

    useEffect(() => {
        if (!showThemePanel) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (themePanelRef.current && !themePanelRef.current.contains(target)) {
                setShowThemePanel(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setShowThemePanel(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [showThemePanel]);

    return (
        <header
            className="flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 select-none transition-colors duration-300"
            style={{ height: "var(--header-height)", WebkitAppRegion: "drag" } as React.CSSProperties}
        >
            {/* Left side: toggle + branding */}
            <div
                className="flex items-center gap-3"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                    title="Toggle Sidebar"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </button>
                <div className="flex items-center gap-2">
                    <img src={murgiLogo} alt="murgiDB logo" className="w-5 h-5 rounded object-cover" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          murgiDB
                    </span>
                </div>
            </div>

            {/* Center: connection status */}
            <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                {activeConnection ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                        <span className="text-[11px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">
                            {activeConnection.name}
                        </span>
                        <div className="w-[1px] h-3 bg-green-500/20" />
                        <span className="text-[10px] text-slate-400 font-medium">
                            {activeConnection.type.toUpperCase()}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Disconnected</span>
                    </div>
                )}
            </div>

            {/* Right side: actions + theme toggle */}
            <div
                className="flex items-center gap-4"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
                <div className="relative" ref={themePanelRef}>
                    <button
                        onClick={() => setShowThemePanel((v) => !v)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-all border border-slate-200 dark:border-slate-700"
                        title="Theme & Palette"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                    </button>

                    {showThemePanel && (
                        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 z-50">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Theme Mode</p>
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-inner">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex-1 p-1 rounded-md transition-all ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="Light Mode"
                                >
                                    <svg className="w-3.5 h-3.5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex-1 p-1 rounded-md transition-all ${theme === 'dark' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="Dark Mode"
                                >
                                    <svg className="w-3.5 h-3.5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setTheme('system')}
                                    className={`flex-1 p-1 rounded-md transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="System Default"
                                >
                                    <svg className="w-3.5 h-3.5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-3 mb-2">Color Palette</p>
                            <div className="grid grid-cols-3 gap-2">
                                {corePalettes.map((key) => {
                                    const preset = ACCENT_PRESETS[key];
                                    const active = accentPalette === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setAccentPalette(key)}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${active ? "border-slate-500 bg-slate-100 dark:bg-slate-800" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                                        >
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(${preset.rgb})` }} />
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-3 mb-2">Brand Palettes</p>
                            <div className="grid grid-cols-3 gap-2">
                                {brandPalettes.map((key) => {
                                    const preset = ACCENT_PRESETS[key];
                                    const active = accentPalette === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setAccentPalette(key)}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${active ? "border-slate-500 bg-slate-100 dark:bg-slate-800" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                                        >
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(${preset.rgb})` }} />
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Custom Accent</span>
                                    <input
                                        type="color"
                                        value={customAccent}
                                        onChange={(e) => {
                                            setCustomAccent(e.target.value);
                                            setAccentPalette("custom");
                                        }}
                                        className="w-8 h-6 p-0 border border-slate-200 dark:border-slate-700 rounded cursor-pointer bg-transparent"
                                    />
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Data Type Colors</span>
                                    <button
                                        onClick={() => applySyntaxPreset(accentPalette)}
                                        className="text-[10px] font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        Auto by Palette
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {syntaxItems.map((item) => (
                                        <label key={item.key} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700">
                                            <span className="font-semibold text-slate-600 dark:text-slate-300">{item.label}</span>
                                            <input
                                                type="color"
                                                value={syntaxColors[item.key]}
                                                onChange={(e) => setSyntaxColor(item.key, e.target.value)}
                                                className="w-7 h-5 p-0 border border-slate-200 dark:border-slate-700 rounded cursor-pointer bg-transparent"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Theme quick controls */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-inner">
                    <button
                        onClick={() => setTheme('light')}
                        className={`p-1 rounded-md transition-all ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Light Mode"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`p-1 rounded-md transition-all ${theme === 'dark' ? 'bg-slate-900 text-slate-100 shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-400'}`}
                        title="Dark Mode"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setTheme('system')}
                        className={`p-1 rounded-md transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-400'}`}
                        title="System Default"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>

                <button
                    onClick={onNewQuery}
                    className="btn-primary text-xs"
                    title="New Query (Ctrl+T)"
                >
                    <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    New Query
                </button>
            </div>
        </header>
    );
};

export default Header;
