import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import getPort from 'get-port'
import fetch from 'node-fetch'
import server from '../lib/server.js'

const { init } = server
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Diff file rendering', () => {
	let httpServer
	let port

	beforeAll(async () => {
		port = await getPort()
		const flags = {
			port,
			livereloadport: false,
			address: 'localhost',
			dir: __dirname,
			silent: true
		}
		httpServer = await init(flags)
	})

	afterAll(async () => {
		if (httpServer && httpServer.httpServer) {
			await new Promise((resolve) => httpServer.httpServer.close(resolve))
		}
		if (httpServer && httpServer.liveReloadServer) {
			httpServer.liveReloadServer.close()
		}
	})

	it('should render .diff files with syntax highlighting', async () => {
		// Test .diff file rendering
		const response = await fetch(`http://localhost:${port}/test.diff`)
		const html = await response.text()

		// Check that the response is HTML
		expect(response.headers.get('content-type')).toBe('text/html')

		// Check that the diff content is rendered with line numbers
		expect(html).toContain('class="code-block-container"')
		expect(html).toContain('class="line-numbered-code"')
		expect(html).toContain('class="line-number"')
		expect(html).toContain('language-diff')

		// Check for diff-specific highlighting classes
		expect(html).toContain('hljs-addition')
		expect(html).toContain('hljs-deletion')
		expect(html).toContain('hljs-meta')

		// Check that the diff content is present
		expect(html).toContain('diff --git')
		expect(html).toContain('@@')

		// Check that the title is set correctly
		expect(html).toContain('test.diff')
	})

	it('should render diff code blocks in markdown', async () => {
		// Create a temporary markdown file with a diff code block
		const mdPath = path.join(__dirname, 'test-diff-block.md')
		const mdContent = `# Test Diff Block

\`\`\`diff
diff --git a/file.js b/file.js
@@ -1,3 +1,4 @@
 function test() {
-  console.log('old');
+  console.log('new');
+  console.log('added');
 }
\`\`\`
`

		fs.writeFileSync(mdPath, mdContent)

		try {
			const response = await fetch(`http://localhost:${port}/test-diff-block.md`)
			const html = await response.text()

			// Check that diff code block is rendered with syntax highlighting
			expect(html).toContain('language-diff')
			expect(html).toContain('hljs-addition')
			expect(html).toContain('hljs-deletion')
		} finally {
			// Clean up
			if (fs.existsSync(mdPath)) {
				fs.unlinkSync(mdPath)
			}
		}
	})

	it('should render .patch files with syntax highlighting', async () => {
		// Create a test .patch file
		const patchPath = path.join(__dirname, 'test.patch')
		const patchContent = `From abc123 Mon Sep 17 00:00:00 2001
From: Test User <test@example.com>
Date: Thu, 28 Nov 2024 10:00:00 +0000
Subject: [PATCH] Test patch file

---
 file.js | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

diff --git a/file.js b/file.js
index abc123..def456 100644
--- a/file.js
+++ b/file.js
@@ -1,3 +1,3 @@
 function test() {
-  return 'old value';
+  return 'new value';
 }
`

		fs.writeFileSync(patchPath, patchContent)

		try {
			const response = await fetch(`http://localhost:${port}/test.patch`)
			const html = await response.text()

			// Check that the response is HTML
			expect(response.headers.get('content-type')).toBe('text/html')

			// Check that patch content is rendered with highlighting
			expect(html).toContain('language-diff')
			expect(html).toContain('test.patch')
		} finally {
			// Clean up
			if (fs.existsSync(patchPath)) {
				fs.unlinkSync(patchPath)
			}
		}
	})
})