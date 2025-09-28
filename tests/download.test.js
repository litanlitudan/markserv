import { describe, it, expect } from 'vitest'
import getPort from 'get-port'
import fetch from 'node-fetch'
import { join } from 'node:path'
import server from '../lib/server.js'

const { init } = server

describe('Download functionality', () => {
	it('should show download button on markdown files', async () => {
		const port = await getPort()
		const flags = {
			port,
			livereloadport: false,
			address: 'localhost',
			dir: process.cwd(),
			silent: true,
		}

		const server = await init(flags)

		try {
			const response = await fetch(`http://localhost:${port}/README.md`)
			const html = await response.text()

			// Check for download button
			expect(html).toContain('download-link')
			expect(html).toContain('Download')
			expect(html).toContain('download=true')
		} finally {
			if (server && server.httpServer) {
				await new Promise((resolve) => server.httpServer.close(resolve))
			}
			if (server && server.liveReloadServer) {
				server.liveReloadServer.close()
			}
		}
	})

	it('should show download page for non-media files with HTML accept header', async () => {
		const port = await getPort()
		const flags = {
			port,
			livereloadport: false,
			address: 'localhost',
			dir: process.cwd(),
			silent: true,
		}

		const server = await init(flags)

		try {
			const response = await fetch(`http://localhost:${port}/package.json`, {
				headers: { Accept: 'text/html' },
			})
			const html = await response.text()

			// Check for download page elements
			expect(html).toContain('download-container')
			expect(html).toContain('File Type:')
			expect(html).toContain('File Size:')
			expect(html).toContain('Download File')
		} finally {
			if (server && server.httpServer) {
				await new Promise((resolve) => server.httpServer.close(resolve))
			}
			if (server && server.liveReloadServer) {
				server.liveReloadServer.close()
			}
		}
	})

	it('should add Content-Disposition header with download=true parameter', async () => {
		const port = await getPort()
		const flags = {
			port,
			livereloadport: false,
			address: 'localhost',
			dir: process.cwd(),
			silent: true,
		}

		const server = await init(flags)

		try {
			const response = await fetch(
				`http://localhost:${port}/package.json?download=true`,
			)

			// Check for download header
			const contentDisposition = response.headers.get('content-disposition')
			expect(contentDisposition).toBeTruthy()
			expect(contentDisposition).toContain('attachment')
			expect(contentDisposition).toContain('package.json')
		} finally {
			if (server && server.httpServer) {
				await new Promise((resolve) => server.httpServer.close(resolve))
			}
			if (server && server.liveReloadServer) {
				server.liveReloadServer.close()
			}
		}
	})

	it('should serve images directly without download page', async () => {
		const port = await getPort()
		const flags = {
			port,
			livereloadport: false,
			address: 'localhost',
			dir: join(process.cwd(), 'media'),
			silent: true,
		}

		const server = await init(flags)

		try {
			const response = await fetch(
				`http://localhost:${port}/markserv-splash.png`,
				{
					headers: { Accept: 'text/html' },
				},
			)

			// Images should be served with proper content type, not HTML
			const contentType = response.headers.get('content-type')
			expect(contentType).toContain('image/png')
			expect(contentType).not.toContain('text/html')
		} finally {
			if (server && server.httpServer) {
				await new Promise((resolve) => server.httpServer.close(resolve))
			}
			if (server && server.liveReloadServer) {
				server.liveReloadServer.close()
			}
		}
	}, 10000) // Increase timeout for this test
})
