import react from "@vitejs/plugin-react";
import { crx, defineManifest } from "@crxjs/vite-plugin";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const manifest = defineManifest({
  manifest_version: 3,
  name: "Captur XHR Requests",
  version: "1.0.0",
  action: { default_popup: "index.html" },
  background: {
    service_worker: "src/background/bg.ts",
    type: "module",
  },
  permissions: ["tabs", "webRequest", "storage"],
  host_permissions: ["<all_urls>"],
});

export default defineConfig({
  resolve: {},
  plugins: [react(), crx({ manifest }), tailwindcss()],
});
