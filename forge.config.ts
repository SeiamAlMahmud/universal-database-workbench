import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerWix } from "@electron-forge/maker-wix";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import path from "path";
import fs from "fs";

const hasWixTools =
  fs.existsSync("C:\\Program Files (x86)\\WiX Toolset v3.11\\bin\\candle.exe") &&
  fs.existsSync("C:\\Program Files (x86)\\WiX Toolset v3.11\\bin\\light.exe");

const config: ForgeConfig = {
  packagerConfig: {
    name: "murgiDB",
    executableName: "murgidb",
    icon: path.join(__dirname, "build", "icon"), // .ico for Windows, .icns for mac, .png for linux (no extension needed)
    // Positive-keep ignore function — works on Windows, macOS, Linux, and CI.
    //
    // Electron Packager calls this function with TWO different path formats:
    //   (1) File-copy loop  →  root-relative  "/.vite/build/main/index.js"
    //   (2) Main-entry validation  →  absolute  "/Users/runner/.../​.vite/build/main/index.js"
    //                                absolute  "D:/a/repo/.vite/build/main/index.js"
    //
    // Strategy: strip the project-root prefix from absolute paths so we always
    // compare a clean relative path against the keep-list.
    ignore: (file: string) => {
      if (!file) return false;

      const normalized = file.replace(/\\/g, "/");
      const appRoot    = __dirname.replace(/\\/g, "/").replace(/\/$/, ""); // no trailing /

      let rel: string;
      if (path.isAbsolute(file) && normalized.startsWith(appRoot)) {
        // Absolute path that begins with the project root → strip it
        rel = normalized.slice(appRoot.length).replace(/^\/+/, "");
      } else {
        // Root-relative (/foo) or already relative (foo) → just strip leading /
        rel = normalized.replace(/^\/+/, "");
      }

      if (!rel)                              return false; // project root itself
      if (rel === "package.json")            return false;
      if (rel.startsWith(".vite/"))          return false; // compiled output ← CRITICAL
      if (rel.startsWith("node_modules/"))   return false;
      if (rel.startsWith("build/"))          return false; // icons etc.

      return true; // exclude everything else (src/, .git/, tsconfig, etc.)
    },
    asar: {
      unpack: "{**/node_modules/better-sqlite3/**,**/node_modules/bindings/**,**/*.node}",
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: "murgidb",
      setupIcon: path.join(__dirname, "build", "icon.ico"),
    }), // Windows: .exe (Squirrel installer)
    ...(hasWixTools
      ? [
          new MakerWix({
            // Windows: .msi (WiX installer)
            name: "murgiDB",
            manufacturer: "Seiam Al Mahmud",
            icon: path.join(__dirname, "build", "icon.ico"),
            upgradeCode: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // unique GUID (do not change)
          }),
        ]
      : []),
    new MakerZIP({}, ["darwin"]),                  // macOS: .zip
    new MakerDeb({}),                              // Linux: .deb
    new MakerRpm({}),                              // Linux: .rpm
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: "src/main/index.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload/index.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
