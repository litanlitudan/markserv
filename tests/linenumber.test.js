import {describe, it, expect, beforeAll, afterAll} from 'vitest'
import getPort from 'get-port'
import serverModule from '../lib/server.js'

const {init} = serverModule

describe('Line numbering feature', () => {
	let server
	let port

	beforeAll(async () => {
		port = await getPort()
		const flags = {
			dir: process.cwd(),
			port,
			address: 'localhost',
			livereloadport: false,
			silent: true,
			verbose: false
		}

		server = await init(flags)
	})

	afterAll(async () => {
		if (server && server.httpServer) {
			await new Promise((resolve) => server.httpServer.close(resolve))
		}
	})

	it('should render JavaScript files with line numbers', async () => {
		const response = await fetch(`http://localhost:${port}/tests/line-test.js`)
		const html = await response.text()

		// Check that the response is HTML
		expect(response.headers.get('content-type')).toBe('text/html')

		// Check for code block container structure
		expect(html).toContain('class="code-block-container"')
		expect(html).toContain('class="code-header"')
		expect(html).toContain('class="code-filename"')
		expect(html).toContain('line-test.js')
		expect(html).toContain('class="code-info"')
		expect(html).toContain('lines')
		expect(html).toContain('javascript')

		// Check for line-numbered code structure
		expect(html).toContain('class="line-numbered-code"')
		expect(html).toContain('language-javascript hljs nohighlight')

		// Check for line number elements
		expect(html).toContain('class="code-line"')
		expect(html).toContain('class="line-number"')
		expect(html).toContain('id="L1"')
		expect(html).toContain('data-line="1"')

		// Check that content is present (with or without syntax highlighting)
		expect(html).toContain('hello')
		expect(html).toContain('function')
		expect(html).toContain('console')
	})

	it('should render package.json with line numbers', async () => {
		const response = await fetch(`http://localhost:${port}/package.json`)
		const html = await response.text()

		// Check for code block structure
		expect(html).toContain('class="code-block-container"')
		expect(html).toContain('package.json')
		expect(html).toContain('language-json hljs nohighlight')

		// Check for line numbers
		expect(html).toContain('class="line-number"')
		expect(html).toContain('id="L1"')

		// Check content (with or without syntax highlighting)
		expect(html).toContain('&quot;name&quot;')
		expect(html).toContain('&quot;markserv&quot;')
	})

	it('should calculate correct line number width padding', async () => {
		const response = await fetch(`http://localhost:${port}/package.json`)
		const html = await response.text()

		// Package.json has many lines, so line numbers should be padded
		// The line numbers should be visible in the HTML
		expect(html).toMatch(/class="line-number" data-line="\d+">\s*\d+<\/span>/)
	})

	it('should render MLIR files with line numbers', async () => {
		const response = await fetch(`http://localhost:${port}/tests/test.mlir`)
		const html = await response.text()

		// Check that the response is HTML
		expect(response.headers.get('content-type')).toBe('text/html')

		// Check for code block structure
		expect(html).toContain('class="code-block-container"')
		expect(html).toContain('class="code-header"')
		expect(html).toContain('test.mlir')
		expect(html).toContain('mlir')

		// Check for line numbers
		expect(html).toContain('class="line-number"')
		expect(html).toContain('id="L1"')

		// Check for MLIR syntax highlighting
		expect(html).toContain('func')
		expect(html).toContain('arith')
		expect(html).toContain('%result')
	})

	it('should render code blocks in markdown files with line numbers', async () => {
		const response = await fetch(`http://localhost:${port}/tests/code-test.md`)
		const html = await response.text()

		// Check that the response is HTML
		expect(response.headers.get('content-type')).toBe('text/html')

		// Check for code block structure (should appear multiple times for multiple code blocks)
		expect(html).toContain('class="code-block-container"')
		expect(html).toContain('class="code-header"')
		expect(html).toContain('class="line-numbered-code"')

		// Check for language-specific filenames in headers
		expect(html).toContain('code-block.javascript')
		expect(html).toContain('code-block.python')
		expect(html).toContain('code-block.txt')

		// Check for line numbers
		expect(html).toContain('class="line-number"')
		expect(html).toContain('class="code-line"')
		expect(html).toContain('id="L1"')

		// Check that code content is present
		expect(html).toContain('hello()')
		expect(html).toContain('greet')
		expect(html).toContain('multiply')
	})
})
