import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceNodeModules = path.resolve(__dirname, '../node_modules')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server (.next/standalone) so the Docker runtime doesn't
  // depend on the pnpm workspace node_modules symlink layout.
  output: 'standalone',
  // The app lives in a pnpm workspace; trace from the repo root so workspace
  // dependencies are bundled into the standalone output.
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  webpack: (config) => {
    // Force the web app to use the same React runtime that Next resolves from the workspace root.
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(workspaceNodeModules, 'react'),
      'react/jsx-runtime': path.resolve(workspaceNodeModules, 'react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(workspaceNodeModules, 'react/jsx-dev-runtime.js'),
      'react-dom': path.resolve(workspaceNodeModules, 'react-dom'),
      'react-dom/client': path.resolve(workspaceNodeModules, 'react-dom/client.js'),
      'react-dom/server': path.resolve(workspaceNodeModules, 'react-dom/server.node.js'),
    }
    return config
  },
}

export default nextConfig
