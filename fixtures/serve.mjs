// Minimal static server for the mock API responses in this folder.
// Usage: pnpm fixtures  ->  http://localhost:8787/<api>/data.json
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT ?? 8787)

createServer(async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  }
  try {
    const path = normalize(new URL(req.url, 'http://x').pathname)
    if (!path.endsWith('.json') || path.includes('..')) throw new Error()
    const body = await readFile(join(root, path))
    res.writeHead(200, headers).end(body)
  } catch {
    res.writeHead(404, headers).end('{"error":"not found"}')
  }
}).listen(port, () => console.log(`fixtures on http://localhost:${port}`))
