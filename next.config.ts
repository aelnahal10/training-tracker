import type { NextConfig } from "next";

// Base path handling for GitHub Pages.
//
// The included GitHub Actions workflow sets PAGES_BASE_PATH automatically from
// your repo name (e.g. "/training-tracker", or "" for a <user>.github.io repo),
// so you normally DON'T need to touch anything here.
//
// `repoName` below is only a fallback for the manual `npm run deploy` script.
// If you deploy that way, set it to your repo name (or "" for a user/org page).
const repoName = "repo-name";

const isProd = process.env.NODE_ENV === "production";
const ciBasePath = process.env.PAGES_BASE_PATH; // injected by CI ("" is valid)

// Applied only to production builds. `npm run dev` always serves from the root.
let basePath = "";
if (isProd) {
  basePath = ciBasePath !== undefined ? ciBasePath : repoName ? `/${repoName}` : "";
}

const nextConfig: NextConfig = {
  // Produce a fully static site in ./out — no Node server needed.
  output: "export",

  // Serve the app from the /repo-name sub-path that GitHub Pages uses.
  basePath,
  assetPrefix: basePath || undefined,

  // GitHub Pages serves each route as a folder/index.html.
  trailingSlash: true,

  // next/image optimization requires a server; disable it for static export.
  images: {
    unoptimized: true,
  },

  // Expose the base path to client code (used for building internal links/icons).
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
