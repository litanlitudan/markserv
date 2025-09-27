/**
 * @fileoverview Modern ES module version of markserv server
 * @module markserv/server
 */

import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, join, parse, relative, normalize } from 'node:path'
import { readFile, stat, readdir } from 'node:fs/promises'
import { constants } from 'node:fs'

import express from 'express'
import compression from 'compression'
import chalk from 'chalk'
import open from 'open'
import { WebSocketServer } from 'ws'
import chokidar from 'chokidar'
import Handlebars from 'handlebars'
import less from 'less'
import micromatch from 'micromatch'
import { lookup } from 'mime-types'
import ora from 'ora'

// Markdown imports
import MarkdownIt from 'markdown-it'
import mdItAnchor from 'markdown-it-anchor'
import mdItTaskLists from 'markdown-it-task-lists'
import mdItHighlightjs from 'markdown-it-highlightjs'
import mdItTOC from 'markdown-it-table-of-contents'
import mdItEmoji from 'markdown-it-emoji'
import mdItMathJax from 'markdown-it-mathjax3'
import hljs from 'highlight.js'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * @typedef {Object} ServerFlags
 * @property {string} dir - Directory to serve
 * @property {number} port - HTTP port
 * @property {number|false} livereloadport - LiveReload port
 * @property {string} address - Server address
 * @property {boolean} silent - Silent mode
 * @property {boolean} verbose - Verbose logging
 * @property {boolean|string} browser - Browser to open
 */

/**
 * Console styling
 */
const style = {
	link: chalk.blueBright.underline.italic,
	github: chalk.blue.underline.italic,
	address: chalk.greenBright.underline.italic,
	port: chalk.reset.cyanBright,
	pid: chalk.reset.cyanBright,
}

/**
 * File type definitions
 */
const fileTypes = {
	markdown: ['.md', '.markdown', '.mdown', '.mkdn', '.mkd', '.mdwn', '.mdtxt', '.mdtext', '.text'],
	html: ['.html', '.htm'],
	mlir: ['.mlir'],
	watch: ['.sass', '.less', '.js', '.css', '.json', '.gif', '.png', '.jpg', '.jpeg', '.mlir'],
}

/**
 * Initialize Markdown-It with plugins
 */
const initMarkdown = () => {
	const md = new MarkdownIt({
		html: true,
		linkify: true,
		typographer: true,
		highlight: (str, lang) => {
			if (lang && hljs.getLanguage(lang)) {
				try {
					return hljs.highlight(str, { language: lang }).value
				} catch (_) {}
			}
			return '' // Use default escaping
		},
	})

	// Custom slugify function
	const slugify = (text) => {
		return text
			.toLowerCase()
			.replace(/[^\w\s-]/g, '') // Remove non-word chars
			.replace(/\s+/g, '-') // Replace spaces with -
			.replace(/-+/g, '-') // Replace multiple - with single -
			.trim()
	}

	// Add plugins
	md.use(mdItAnchor, { slugify })
		.use(mdItTaskLists)
		.use(mdItHighlightjs)
		.use(mdItEmoji)
		.use(mdItMathJax)
		.use(customFencePlugin) // Custom plugin for Mermaid and MLIR
		.use(mdItTOC, {
			includeLevel: [1, 2, 3, 4, 5, 6],
			slugify,
		})

	return md
}

/**
 * Custom fence plugin for Mermaid and MLIR
 */
const customFencePlugin = (md) => {
	const defaultRender = md.renderer.rules.fence || ((tokens, idx, options, _env, renderer) => {
		return renderer.renderToken(tokens, idx, options)
	})

	md.renderer.rules.fence = (tokens, idx, options, env, renderer) => {
		const token = tokens[idx]
		const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''

		if (info === 'mermaid') {
			const content = token.content.trim()
			const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
			return `<div class="mermaid" id="${id}">${md.utils.escapeHtml(content)}</div>\n`
		}

		if (info === 'mlir') {
			const content = token.content.trim()
			return mlirToHTML(content)
		}

		return defaultRender(tokens, idx, options, env, renderer)
	}
}

/**
 * MLIR syntax highlighting
 * @param {string} mlirText - MLIR code to highlight
 * @returns {string} HTML with syntax highlighting
 */
const mlirToHTML = (mlirText) => {
	// Register MLIR language with highlight.js if not already done
	if (!hljs.getLanguage('mlir')) {
		hljs.registerLanguage('mlir', () => ({
			keywords: {
				keyword: 'func return module attributes br cond_br constant alloca load store memref tensor vector affine scf std arith math linalg sparse_tensor bufferization gpu llvm spirv public private internal nested opaque external',
				type: 'i1 i8 i16 i32 i64 i128 f16 f32 f64 f80 f128 bf16 index none',
			},
			contains: [
				hljs.C_LINE_COMMENT_MODE,
				hljs.C_BLOCK_COMMENT_MODE,
				hljs.QUOTE_STRING_MODE,
				hljs.NUMBER_MODE,
				{
					className: 'meta',
					begin: '@[\\w.]+',
				},
				{
					className: 'variable',
					begin: '%[\\w.]+',
				},
				{
					className: 'symbol',
					begin: '\\^[\\w.]+',
				},
			],
		}))
	}

	const highlighted = hljs.highlight(mlirText, { language: 'mlir' }).value
	return `<pre><code class="language-mlir hljs">${highlighted}</code></pre>`
}

/**
 * Modern Express-based server setup
 * @param {ServerFlags} flags - Server configuration
 * @returns {Promise<Object>} Server instance
 */
export const init = async (flags) => {
	const spinner = ora('Starting Markserv...').start()

	// Create Express app
	const app = express()

	// Add compression
	app.use(compression())

	// Initialize Markdown processor
	const md = initMarkdown()

	// Setup WebSocket for LiveReload
	let wss = null
	if (flags.livereloadport !== false) {
		wss = new WebSocketServer({ port: flags.livereloadport })

		// Watch for file changes
		const watcher = chokidar.watch(flags.dir, {
			ignored: ['**/node_modules/**', '**/.git/**'],
			persistent: true,
		})

		watcher.on('change', (path) => {
			// Notify all connected clients
			wss.clients.forEach((client) => {
				if (client.readyState === 1) {
					// WebSocket.OPEN
					client.send(JSON.stringify({ type: 'reload', path }))
				}
			})
		})

		// Inject LiveReload script
		app.use((req, res, next) => {
			if (req.accepts('html')) {
				const originalSend = res.send
				res.send = function (data) {
					if (typeof data === 'string' && data.includes('</body>')) {
						const script = `
							<script>
								(function() {
									const ws = new WebSocket('ws://localhost:${flags.livereloadport}');
									ws.onmessage = (event) => {
										const msg = JSON.parse(event.data);
										if (msg.type === 'reload') {
											window.location.reload();
										}
									};
								})();
							</script>
						`
						data = data.replace('</body>', `${script}</body>`)
					}
					originalSend.call(this, data)
				}
			}
			next()
		})
	}

	/**
	 * Main request handler
	 */
	app.get('*', async (req, res, next) => {
		try {
			const urlPath = decodeURIComponent(req.path)
			const filePath = normalize(join(flags.dir, urlPath))

			// Security check - prevent directory traversal
			if (!filePath.startsWith(normalize(flags.dir))) {
				return res.status(403).send('Access denied')
			}

			// Check if file exists
			try {
				await stat(filePath)
			} catch {
				// Handle favicon specially
				if (urlPath === '/favicon.ico') {
					const faviconPath = join(__dirname, 'icons', 'markserv.svg')
					const favicon = await readFile(faviconPath)
					return res.type('image/svg+xml').send(favicon)
				}
				return res.status(404).send('Not found')
			}

			const stats = await stat(filePath)

			if (stats.isDirectory()) {
				// Render directory listing
				const files = await readdir(filePath)
				const html = await renderDirectory(filePath, files, flags)
				return res.send(html)
			}

			const ext = parse(filePath).ext.toLowerCase()

			// Handle Markdown files
			if (fileTypes.markdown.includes(ext)) {
				const content = await readFile(filePath, 'utf-8')
				const rendered = md.render(content)
				const html = await renderMarkdown(rendered, filePath, flags)
				return res.send(html)
			}

			// Handle MLIR files
			if (fileTypes.mlir.includes(ext)) {
				const content = await readFile(filePath, 'utf-8')
				const highlighted = mlirToHTML(content)
				const html = await renderMarkdown(highlighted, filePath, flags)
				return res.send(html)
			}

			// Handle HTML files
			if (fileTypes.html.includes(ext)) {
				const content = await readFile(filePath, 'utf-8')
				// Process includes if needed
				const processed = await processIncludes(content, dirname(filePath))
				return res.send(processed)
			}

			// Serve static files
			const mimeType = lookup(filePath) || 'application/octet-stream'
			res.type(mimeType)
			const content = await readFile(filePath)
			res.send(content)

		} catch (error) {
			console.error('Error handling request:', error)
			res.status(500).send('Internal server error')
		}
	})

	// Create HTTP server
	const server = createServer(app)

	// Start server
	await new Promise((resolve, reject) => {
		server.listen(flags.port, flags.address, (err) => {
			if (err) reject(err)
			else resolve()
		})
	})

	spinner.succeed(`Markserv started on ${chalk.green(`http://${flags.address}:${flags.port}`)}`)

	// Open browser if requested
	if (flags.browser !== false && flags.browser !== 'false') {
		await open(`http://${flags.address}:${flags.port}`)
	}

	// Return server instance
	return {
		server,
		wss,
		app,
		stop: async () => {
			if (wss) wss.close()
			server.close()
		},
	}
}

/**
 * Render markdown content with template
 */
async function renderMarkdown(content, filePath, flags) {
	const templatePath = join(__dirname, 'templates', 'markdown.html')
	const template = await readFile(templatePath, 'utf-8')
	const compiled = Handlebars.compile(template)

	return compiled({
		title: parse(filePath).base,
		content,
		pid: process.pid,
	})
}

/**
 * Render directory listing
 */
async function renderDirectory(dirPath, files, flags) {
	const templatePath = join(__dirname, 'templates', 'directory.html')
	const template = await readFile(templatePath, 'utf-8')
	const compiled = Handlebars.compile(template)

	// Filter hidden files
	const visibleFiles = files.filter((f) => !f.startsWith('.'))

	// Generate file list HTML
	const fileList = await Promise.all(
		visibleFiles.map(async (file) => {
			const filePath = join(dirPath, file)
			const stats = await stat(filePath)
			const isDir = stats.isDirectory()
			const href = isDir ? `${file}/` : file
			const icon = isDir ? 'folder' : getFileIcon(file)

			return `<li class="icon ${icon}"><a href="${href}">${href}</a></li>`
		})
	)

	return compiled({
		title: parse(dirPath).base || 'Index',
		content: `<ul>${fileList.join('\n')}</ul>`,
		pid: process.pid,
	})
}

/**
 * Get icon class for file
 */
function getFileIcon(filename) {
	const ext = parse(filename).ext.toLowerCase()
	const iconMap = {
		'.js': 'javascript',
		'.json': 'json',
		'.md': 'markdown',
		'.html': 'html',
		'.css': 'css',
		'.png': 'image',
		'.jpg': 'image',
		'.gif': 'image',
		// Add more mappings as needed
	}
	return iconMap[ext] || 'file'
}

/**
 * Process includes in HTML content
 */
async function processIncludes(content, baseDir) {
	// Simple regex-based include processor
	const includeRegex = /\{(markdown|html|less):\s*([^}]+)\}/g

	const promises = []
	let match

	while ((match = includeRegex.exec(content)) !== null) {
		const [fullMatch, type, path] = match
		const includePath = join(baseDir, path.trim())

		promises.push(
			readFile(includePath, 'utf-8').then(async (includeContent) => {
				if (type === 'markdown') {
					const md = initMarkdown()
					return md.render(includeContent)
				} else if (type === 'less') {
					const result = await less.render(includeContent)
					return `<style>${result.css}</style>`
				}
				return includeContent
			})
		)
	}

	const results = await Promise.all(promises)
	let index = 0

	return content.replace(includeRegex, () => results[index++])
}

// Default export
export default { init }