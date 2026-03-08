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

const config: ForgeConfig = {
  packagerConfig: {
    name: "murgiDB",
    executableName: "murgidb",
    icon: path.join(__dirname, "build", "icon"), // .ico for Windows, .icns for mac, .png for linux (no extension needed)
    // Keep node_modules in packaged app for externalized native deps like better-sqlite3.
    ignore: (file: string) => {
      if (!file) return false;
      return !(
        file.startsWith("/.vite") ||
        file.startsWith("/node_modules") ||
        file === "/package.json"
      );
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
    new MakerWix({                                 // Windows: .msi (WiX installer)
      name: "murgiDB",
      manufacturer: "Seiam Al Mahmud",
      icon: path.join(__dirname, "build", "icon.ico"),
      upgradeCode: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // unique GUID (do not change)
    }),
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
