'use strict'

import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'

import chalk from 'chalk'
import open from 'open'
import express from 'express'
import compression from 'compression'
import less from 'less'
// send removed - using express static serving
// livereload replaced with WebSocket
import { WebSocketServer } from 'ws'
import chokidar from 'chokidar'
// connect-livereload removed - handled manually with express
// Simple implant replacement for template variable substitution
const processTemplate = async (html, handlers, opts) => {
	let result = html
	// Simple regex-based template variable replacement
	const regex = /\{\{\s*(\w+)\s*\}\}/g
	const matches = [...result.matchAll(regex)]

	for (const match of matches) {
		const [fullMatch, varName] = match
		if (handlers[varName]) {
			const value = await handlers[varName](varName)
			if (value !== false) {
				result = result.replace(fullMatch, value)
			}
		}
	}

	return result
}

// Simple deepmerge replacement
const deepMerge = (target, source) => {
	return Object.assign({}, target, source)
}
import handlebars from 'handlebars'
import MarkdownIt from 'markdown-it'
import mdItAnchor from 'markdown-it-anchor'
// These are CommonJS modules that need special handling in ES modules
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const mdItTaskLists = require('markdown-it-task-lists')
const mdItEmojiAll = require('markdown-it-emoji')
const mdItEmoji = mdItEmojiAll.full || mdItEmojiAll
const mdItTOC = require('markdown-it-table-of-contents')

import mdItHLJS from 'markdown-it-highlightjs'
import mdItMathJax from 'markdown-it-mathjax3'
import emojiRegexCreator from 'emoji-regex'
import isOnline from 'is-online'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
// spawn removed - was used for upgrade feature that's currently disabled
// import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const emojiRegex = emojiRegexCreator()
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

const style = {
	link: chalk.blueBright.underline.italic,
	github: chalk.blue.underline.italic,
	address: chalk.greenBright.underline.italic,
	port: chalk.reset.cyanBright,
	pid: chalk.reset.cyanBright
}

const slugify = text => {
	return text.toLowerCase().replace(/\s/g, '-')
		// Remove punctuations other than hyphen and underscore
		.replace(/[`~!@#$%^&*()+=<>?,./:;"'|{}[\]\\\u2000-\u206F\u2E00-\u2E7F]/g, '')
		// Remove emojis
		.replace(emojiRegex, '')
		// Remove CJK punctuations
		.replace(/[\u3000。？！，、；：""【】（）〔〕［］﹃﹄""''﹁﹂—…－～《》〈〉「」]/g, '')
}

// Custom Mermaid and MLIR plugin for markdown-it
const customFencePlugin = md => {
	const defaultRender = md.renderer.rules.fence || function(tokens, idx, options, env, renderer) {
		return renderer.renderToken(tokens, idx, options)
	}

	md.renderer.rules.fence = function(tokens, idx, options, env, renderer) {
		const token = tokens[idx]
		const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''

		if (info === 'mermaid') {
			const content = token.content.trim()
			// Generate unique ID for each mermaid diagram
			const id = 'mermaid-' + Math.random().toString(36).substr(2, 9)
			return `<div class="mermaid" id="${id}">${md.utils.escapeHtml(content)}</div>\n`
		}

		// Handle MLIR code blocks
		if (info === 'mlir') {
			const content = token.content.trim()
			return mlirToHTML(content)
		}

		return defaultRender(tokens, idx, options, env, renderer)
	}
}

// MLIR to HTML conversion function
const mlirToHTML = mlirText => {
	// Escape HTML characters
	const escapeHtml = str => str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')

	// Add syntax highlighting for MLIR
	const highlightMLIR = text => {
		// MLIR keywords
		const keywords = [
			'func', 'return', 'module', 'attributes', 'br', 'cond_br',
			'constant', 'alloca', 'load', 'store', 'memref', 'tensor',
			'vector', 'affine', 'scf', 'std', 'arith', 'math', 'linalg',
			'sparse_tensor', 'bufferization', 'gpu', 'llvm', 'spirv',
			'public', 'private', 'internal', 'nested', 'opaque', 'external'
		]

		// MLIR types
		const types = [
			'i1', 'i8', 'i16', 'i32', 'i64', 'i128',
			'f16', 'f32', 'f64', 'f80', 'f128',
			'bf16', 'index', 'none'
		]

		let highlighted = escapeHtml(text)

		// Highlight comments (// and /* */)
		highlighted = highlighted.replace(/(\/\/[^\n]*)/g, '<span class="hljs-comment">$1</span>')
		highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hljs-comment">$1</span>')

		// Highlight strings
		highlighted = highlighted.replace(/(&quot;[^&]*&quot;)/g, '<span class="hljs-string">$1</span>')

		// Highlight numbers
		highlighted = highlighted.replace(/\b(\d+\.?\d*([eE][+-]?\d+)?)\b/g, '<span class="hljs-number">$1</span>')

		// Highlight attributes (@...)
		highlighted = highlighted.replace(/@[\w.]+/g, match => `<span class="hljs-meta">${match}</span>`)

		// Highlight SSA values (%...)
		highlighted = highlighted.replace(/%[\w.]+/g, match => `<span class="hljs-variable">${match}</span>`)

		// Highlight block labels (^...)
		highlighted = highlighted.replace(/\^[\w.]+/g, match => `<span class="hljs-symbol">${match}</span>`)

		// Highlight types
		types.forEach(type => {
			const regex = new RegExp(`\\b(${type})\\b`, 'g')
			highlighted = highlighted.replace(regex, '<span class="hljs-type">$1</span>')
		})

		// Highlight keywords
		keywords.forEach(keyword => {
			const regex = new RegExp(`\\b(${keyword})\\b`, 'g')
			highlighted = highlighted.replace(regex, '<span class="hljs-keyword">$1</span>')
		})

		// Highlight dialect operations (dialect.operation format)
		highlighted = highlighted.replace(/\b(\w+)\.(\w+)/g,
			'<span class="hljs-built_in">$1</span>.<span class="hljs-function">$2</span>')

		return highlighted
	}

	const highlightedCode = highlightMLIR(mlirText)

	return `<pre><code class="language-mlir hljs">${highlightedCode}</code></pre>`
}

const md = new MarkdownIt({
	linkify: false,
	html: true
})
	.use(mdItAnchor, {slugify})
	.use(mdItTaskLists)
	.use(mdItHLJS)
	.use(mdItEmoji)
	.use(mdItMathJax)
	.use(customFencePlugin)
	.use(mdItTOC, {
		includeLevel: [1, 2, 3, 4, 5, 6],
		slugify
	})

// Markdown Extension Types
const fileTypes = {
	markdown: [
		'.markdown',
		'.mdown',
		'.mkdn',
		'.md',
		'.mkd',
		'.mdwn',
		'.mdtxt',
		'.mdtext',
		'.text'
	],

	html: [
		'.html',
		'.htm'
	],

	mlir: [
		'.mlir'
	],

	watch: [
		'.sass',
		'.less',
		'.js',
		'.css',
		'.json',
		'.gif',
		'.png',
		'.jpg',
		'.jpeg',
		'.mlir'
	],

	exclusions: [
		'node_modules/',
		'.git/'
	]
}

fileTypes.watch = fileTypes.watch
	.concat(fileTypes.markdown)
	.concat(fileTypes.html)

const materialIcons = require(path.join(__dirname, 'icons', 'material-icons.json'))

const faviconPath = path.join(__dirname, 'icons', 'markserv.svg')
const faviconData = fs.readFileSync(faviconPath)

const log = (str, flags, err) => {
	if (flags.silent) {
		return
	}

	if (str) {
		console.log(str)
	}

	if (err) {
		console.error(err)
	}
}

const msg = (type, msg, flags) => {
	if (type === 'github') {
		return log(chalk.bgYellow.black('    GitHub  ') + ' ' + msg, flags)
	}

	log(chalk.bgGreen.black('  Markserv  ') + chalk.white(` ${type}: `) + msg, flags)
}

const errormsg = (type, msg, flags, err) =>
	log(chalk.bgRed.white('  Markserv  ') + chalk.red(` ${type}: `) + msg, flags, err)

const warnmsg = (type, msg, flags) =>
	log(chalk.bgYellow.black('  Markserv  ') + chalk.yellow(` ${type}: `) + msg, flags)

const isType = (exts, filePath) => {
	const fileExt = path.parse(filePath).ext
	return exts.includes(fileExt)
}

// MarkdownToHTML: turns a Markdown file into HTML content
const markdownToHTML = markdownText => new Promise((resolve, reject) => {
	let result

	try {
		result = md.render(markdownText)
	} catch (error) {
		return reject(error)
	}

	resolve(result)
})

// GetFile: reads utf8 content from a file
const getFile = path => new Promise((resolve, reject) => {
	fs.readFile(path, 'utf8', (err, data) => {
		if (err) {
			return reject(err)
		}

		resolve(data)
	})
})

// Get Custom Less CSS to use in all Markdown files
const buildLessStyleSheet = cssPath =>
	new Promise(resolve =>
		getFile(cssPath).then(data =>
			less.render(data).then(data =>
				resolve(data.css)
			)
		)
	)

const baseTemplate = (templateUrl, handlebarData) => new Promise((resolve, reject) => {
	getFile(templateUrl).then(source => {
		const template = handlebars.compile(source)
		const output = template(handlebarData)
		resolve(output)
	}).catch(reject)
})

const lookUpIconClass = (path, type) => {
	let iconDef

	if (type === 'folder') {
		iconDef = materialIcons.folderNames[path]

		if (!iconDef) {
			iconDef = 'folder'
		}
	}

	if (type === 'file') {
		// Try extensions first
		const ext = path.slice(path.lastIndexOf('.') + 1)
		iconDef = materialIcons.fileExtensions[ext]

		// Then try applying the filename
		if (!iconDef) {
			iconDef = materialIcons.fileNames[path]
		}

		if (!iconDef) {
			iconDef = 'file'
		}
	}

	return iconDef
}

const dirToHtml = filePath => {
	const urls = fs.readdirSync(filePath)

	let list = '<ul>\n'

	let prettyPath = '/' + path.relative(process.cwd(), filePath)
	if (prettyPath[prettyPath.length] !== '/') {
		prettyPath += '/'
	}

	if (prettyPath.slice(prettyPath.length - 2, 2) === '//') {
		prettyPath = prettyPath.slice(0, prettyPath.length - 1)
	}

	urls.forEach(subPath => {
		if (subPath.charAt(0) === '.') {
			return
		}

		const dir = fs.statSync(filePath + subPath).isDirectory()
		let href
		if (dir) {
			href = subPath + '/'
			list += `\t<li class="icon folder isfolder"><a href="${href}">${href}</a></li> \n`
		} else {
			href = subPath
			const iconClass = lookUpIconClass(href, 'file')
			list += `\t<li class="icon ${iconClass} isfile"><a href="${href}">${href}</a></li> \n`
		}
	})

	list += '</ul>\n'

	return list
}

// Remove URL params from file being fetched
const getPathFromUrl = url => {
	return url.split(/[?#]/)[0]
}

const markservPageObject = {
	lib: (dir, opts) => {
		const relPath = path.join('lib', opts.rootRelUrl)
		return relPath
	}
}

const secureUrl = url => {
	const encodedUrl = encodeURI(url.replace(/%/g, '%25'))
	return encodedUrl
}

// Create breadcrumb trail tracks
const createBreadcrumbs = path => {
	const crumbs = [{
		href: '/',
		text: './'
	}]

	const dirParts = path.replace(/(^\/+|\/+$)/g, '').split('/')
	const urlParts = dirParts.map(secureUrl)

	if (path.length === 0) {
		return crumbs
	}

	let collectPath = '/'

	dirParts.forEach((dirName, i) => {
		const fullLink = collectPath + urlParts[i] + '/'

		const crumb = {
			href: fullLink,
			text: dirName + '/'
		}

		crumbs.push(crumb)
		collectPath = fullLink
	})

	return crumbs
}

// Http_request_handler: handles all the browser requests
const createRequestHandler = flags => {
	let {dir} = flags
	const isDir = fs.statSync(dir).isDirectory()
	if (!isDir) {
		dir = path.parse(flags.dir).dir
	}

	flags.$openLocation = path.relative(dir, flags.dir)

	const implantOpts = {
		maxDepth: 10
	}

	const implantHandlers = {
		markserv: prop => new Promise(resolve => {
			if (Reflect.has(markservPageObject, prop)) {
				const value = path.relative(dir, __dirname)
				return resolve(value)
			}

			resolve(false)
		}),

		file: (url, opts) => new Promise(resolve => {
			const absUrl = path.join(opts.baseDir, url)
			getFile(absUrl)
				.then(data => {
					msg('implant', style.link(absUrl), flags)
					resolve(data)
				})
				.catch(error => {
					warnmsg('implant 404', style.link(absUrl), flags, error)
					resolve(false)
				})
		}),

		less: (url, opts) => new Promise(resolve => {
			const absUrl = path.join(opts.baseDir, url)
			buildLessStyleSheet(absUrl)
				.then(data => {
					msg('implant', style.link(absUrl), flags)
					resolve(data)
				})
				.catch(error => {
					warnmsg('implant 404', style.link(absUrl), flags, error)
					resolve(false)
				})
		}),

		markdown: (url, opts) => new Promise(resolve => {
			const absUrl = path.join(opts.baseDir, url)
			getFile(absUrl).then(markdownToHTML)
				.then(data => {
					msg('implant', style.link(absUrl), flags)
					resolve(data)
				})
				.catch(error => {
					warnmsg('implant 404', style.link(absUrl), flags, error)
					resolve(false)
				})
		}),

		html: (url, opts) => new Promise(resolve => {
			const absUrl = path.join(opts.baseDir, url)
			getFile(absUrl)
				.then(data => {
					msg('implant', style.link(absUrl), flags)
					resolve(data)
				})
				.catch(error => {
					warnmsg('implant 404', style.link(absUrl), flags, error)
					resolve(false)
				})
		})
	}

	const markservUrlLead = '%7Bmarkserv%7D'

	return (req, res) => {
		const decodedUrl = getPathFromUrl(decodeURIComponent(req.originalUrl))
		const filePath = path.normalize(unescape(dir) + unescape(decodedUrl))
		const baseDir = path.parse(filePath).dir
		implantOpts.baseDir = baseDir

		const errorPage = (code, filePath, err) => {
			errormsg(code, filePath, flags, err)

			const templateUrl = path.join(__dirname, 'templates/error.html')
			const fileName = path.parse(filePath).base
			const referer = unescape(req.headers.referer || path.parse(decodedUrl).dir + '/')
			const errorMsg = md.utils.escapeHtml(err.message)
			const errorStack = md.utils.escapeHtml(String(err.stack))

			const handlebarData = {
				pid: process.pid | 'N/A',
				code,
				fileName,
				filePath,
				errorMsg,
				errorStack,
				referer
			}

			return baseTemplate(templateUrl, handlebarData).then(final => {
				res.writeHead(200, {
					'content-type': 'text/html; charset=utf-8'
				})
				res.end(final)
			})
		}

		if (flags.verbose) {
			msg('request', filePath, flags)
		}

		const isMarkservUrl = req.url.includes(markservUrlLead)
		if (isMarkservUrl) {
			const markservFilePath = req.url.split(markservUrlLead)[1]
			const markservRelFilePath = path.join(__dirname, markservFilePath)
			if (flags.verbose) {
				msg('{markserv url}', style.link(markservRelFilePath), flags)
			}

			// Send static file
			const stream = fs.createReadStream(markservRelFilePath)
			stream.on('error', () => {
				res.status(404).end()
			})
			stream.pipe(res)
			return
		}

		const prettyPath = filePath

		let stat
		let isDir
		let isMarkdown
		let isHtml
		let isMLIR

		try {
			stat = fs.statSync(filePath)
			isDir = stat.isDirectory()
			if (!isDir) {
				isMarkdown = isType(fileTypes.markdown, filePath)
				isHtml = isType(fileTypes.html, filePath)
				isMLIR = isType(fileTypes.mlir, filePath)
			}
		} catch (error) {
			const fileName = path.parse(filePath).base
			if (fileName === 'favicon.ico') {
				res.writeHead(200, {'Content-Type': 'image/x-icon'})
				res.write(faviconData)
				res.end()
				return
			}

			errormsg('404', filePath, flags, error)
			errorPage(404, filePath, error)
			return
		}

		// Markdown: Browser is requesting a Markdown file
		if (isMarkdown) {
			msg('markdown', style.link(prettyPath), flags)
			getFile(filePath).then(markdownToHTML).then(filePath).then(html => {
				return processTemplate(html, implantHandlers, implantOpts).then(output => {
					const templateUrl = path.join(__dirname, 'templates/markdown.html')

					const handlebarData = {
						title: path.parse(filePath).base,
						content: output,
						pid: process.pid | 'N/A'
					}

					return baseTemplate(templateUrl, handlebarData).then(final => {
						const lvl2Dir = path.parse(templateUrl).dir
						const lvl2Opts = deepMerge(implantOpts, {baseDir: lvl2Dir})

						return processTemplate(final, implantHandlers, lvl2Opts)
							.then(output => {
								res.writeHead(200, {
									'content-type': 'text/html'
								})
								res.end(output)
							})
					})
				})
			}).catch(error => {
				console.error(error)
			})
		} else if (isHtml) {
			msg('html', style.link(prettyPath), flags)
			getFile(filePath).then(html => {
				return processTemplate(html, implantHandlers, implantOpts).then(output => {
					res.writeHead(200, {
						'content-type': 'text/html'
					})
					res.end(output)
				})
			}).catch(error => {
				console.error(error)
			})
		} else if (isMLIR) {
			// MLIR: Browser is requesting an MLIR file
			msg('mlir', style.link(prettyPath), flags)
			getFile(filePath).then(mlirContent => {
				const htmlContent = mlirToHTML(mlirContent)
				const templateUrl = path.join(__dirname, 'templates/markdown.html')

				const handlebarData = {
					title: path.parse(filePath).base,
					content: htmlContent,
					pid: process.pid | 'N/A'
				}

				return baseTemplate(templateUrl, handlebarData).then(final => {
					const lvl2Dir = path.parse(templateUrl).dir
					const lvl2Opts = deepMerge(implantOpts, {baseDir: lvl2Dir})

					return processTemplate(final, implantHandlers, lvl2Opts)
						.then(output => {
							res.writeHead(200, {
								'content-type': 'text/html'
							})
							res.end(output)
						})
				})
			}).catch(error => {
				errorPage(500, filePath, error)
			})
		} else if (isDir) {
			try {
				// Index: Browser is requesting a Directory Index
				msg('dir', style.link(prettyPath), flags)

				const templateUrl = path.join(__dirname, 'templates/directory.html')

				const handlebarData = {
					dirname: path.parse(filePath).dir,
					content: dirToHtml(filePath),
					title: path.parse(filePath).base,
					pid: process.pid | 'N/A',
					breadcrumbs: createBreadcrumbs(path.relative(dir, filePath))
				}

				return baseTemplate(templateUrl, handlebarData).then(final => {
					const lvl2Dir = path.parse(templateUrl).dir
					const lvl2Opts = deepMerge(implantOpts, {baseDir: lvl2Dir})
					return processTemplate(final, implantHandlers, lvl2Opts).then(output => {
						res.writeHead(200, {
							'content-type': 'text/html'
						})
						res.end(output)
					}).catch(error => {
						console.error(error)
					})
				})
			} catch (error) {
				errorPage(500, filePath, error)
			}
		} else {
			// Other: Browser requests other MIME typed file (handled by 'send')
			msg('file', style.link(prettyPath), flags)
			// Send file with proper mime type
			const mimeType = mime.contentType(path.extname(filePath))
			if (mimeType) {
				res.setHeader('Content-Type', mimeType)
			}
			const stream = fs.createReadStream(filePath)
			stream.on('error', () => {
				res.status(404).end()
			})
			stream.pipe(res)
		}
	}
}

const startExpressApp = (liveReloadPort, httpRequestHandler) => {
	const app = express()
	app.use(compression())
	if (liveReloadPort && liveReloadPort !== 'false') {
		// LiveReload script injection handled in templates
		app.use((req, res, next) => {
			if (req.headers.accept && req.headers.accept.includes('text/html')) {
				res.locals.liveReloadPort = liveReloadPort
			}
			next()
		})
	}
	app.use('/', httpRequestHandler)
	return app
}

// Helper function to check if a port is available
const checkPortAvailable = (port, address) => {
	return new Promise((resolve) => {
		const tester = http.createServer()
		tester.once('error', (err) => {
			if (err.code === 'EADDRINUSE') {
				resolve(false)
			} else {
				resolve(false)
			}
		})
		tester.once('listening', () => {
			tester.close(() => resolve(true))
		})
		tester.listen(port, address)
	})
}

// Helper function to find an available port
const findAvailablePort = async (startPort, address, maxAttempts = 10) => {
	for (let i = 0; i < maxAttempts; i++) {
		const port = startPort + i
		const available = await checkPortAvailable(port, address)
		if (available) {
			return port
		}
	}
	throw new Error(`Could not find available port after ${maxAttempts} attempts starting from ${startPort}`)
}

const startHTTPServer = async (expressApp, port, flags) => {
	let httpServer

	if (expressApp) {
		httpServer = http.createServer(expressApp)
	} else {
		httpServer = http.createServer()
	}

	// Try to listen on the specified port
	return new Promise((resolve, reject) => {
		httpServer.once('error', async (err) => {
			if (err.code === 'EADDRINUSE') {
				msg('port', chalk.yellow(`Port ${port} is already in use, finding an available port...`), flags)
				try {
					const newPort = await findAvailablePort(parseInt(port) + 1, flags.address)
					msg('port', chalk.green(`Using port ${newPort} instead`), flags)
					httpServer.listen(newPort, flags.address, () => {
						resolve({ server: httpServer, port: newPort })
					})
				} catch (findErr) {
					reject(findErr)
				}
			} else {
				reject(err)
			}
		})

		httpServer.once('listening', () => {
			resolve({ server: httpServer, port: port })
		})

		httpServer.listen(port, flags.address)
	})
}

const startLiveReloadServer = async (liveReloadPort, flags) => {
	let {dir} = flags
	const isDir = fs.statSync(dir).isDirectory()
	if (!isDir) {
		dir = path.parse(flags.dir).dir
	}

	msg('watch', path.dirname(dir), flags)

	// Try to create WebSocket server for live reload
	let wss
	let actualPort = liveReloadPort
	try {
		wss = new WebSocketServer({ port: liveReloadPort })
	} catch (err) {
		if (err.code === 'EADDRINUSE') {
			msg('livereload', chalk.yellow(`LiveReload port ${liveReloadPort} is already in use, finding an available port...`), flags)
			try {
				actualPort = await findAvailablePort(liveReloadPort + 1, '::', 10)
				msg('livereload', chalk.green(`Using LiveReload port ${actualPort} instead`), flags)
				wss = new WebSocketServer({ port: actualPort })
			} catch (findErr) {
				throw findErr
			}
		} else {
			throw err
		}
	}

	// Handle WebSocket server errors
	wss.on('error', async (err) => {
		if (err.code === 'EADDRINUSE' && !wss.clients) {
			msg('livereload', chalk.yellow(`LiveReload port ${actualPort} is already in use, finding an available port...`), flags)
			try {
				actualPort = await findAvailablePort(actualPort + 1, '::', 10)
				msg('livereload', chalk.green(`Using LiveReload port ${actualPort} instead`), flags)
				// Close the old server and create new one
				wss.close()
				wss = new WebSocketServer({ port: actualPort })
			} catch (findErr) {
				errormsg('livereload', `Could not find available port for LiveReload: ${findErr.message}`, flags, findErr)
			}
		}
	})

	// Track connected clients
	const clients = new Set()

	wss.on('connection', (ws) => {
		clients.add(ws)
		ws.on('close', () => {
			clients.delete(ws)
		})
	})

	// Watch for file changes
	const watcher = chokidar.watch(dir, {
		ignored: [
			/(^|[\/\\])\../, // Hidden files
			/node_modules/,
			/__pycache__/,
			/.git/
		],
		persistent: true
	})

	watcher.on('change', (filepath) => {
		msg('reload', filepath, flags)
		// Send reload message to all connected clients
		clients.forEach(ws => {
			if (ws.readyState === ws.OPEN) {
				ws.send(JSON.stringify({ type: 'reload' }))
			}
		})
	})

	return { wss, watcher, port: actualPort }
}

const logActiveServerInfo = async (serveURL, actualHttpPort, liveReloadPort, flags) => {
	const dir = path.resolve(flags.dir)

	const githubLink = 'github.com/markserv'

	msg('address', style.address(serveURL), flags)
	msg('path', chalk.grey(style.address(dir)), flags)
	msg('livereload', chalk.grey('communicating on port: ' + style.port(liveReloadPort)), flags)

	if (process.pid) {
		msg('process', chalk.grey('your pid is: ' + style.pid(process.pid)), flags)
		msg('stop', chalk.grey('press ' + chalk.magenta('[Ctrl + C]') + ' or type ' + chalk.magenta(`"sudo kill -9 ${process.pid}"`)), flags)
	}

	msg('github', 'Contribute on Github - ' + chalk.yellow.underline(githubLink), flags)
}

const checkForUpgrade = () => new Promise((resolve) => {
	// For now, skip upgrade check since analyze-deps is not available
	// This can be replaced with a simpler npm API check
	resolve(false)
})

// doUpgrade is kept for potential future use
// const doUpgrade = (newerVersion, flags) => {
// 	msg(chalk.bgRed('✨UPGRADE✨'), 'Upgrade beginning...', flags)
// 	const ls = spawn('npm', ['i', '-g', `markserv@${newerVersion}`], {stdio: [0, 1, 2]})
//
// 	ls.on('exit', code => {
// 		if (code) {
// 			return msg(chalk.bgRed('✨UPGRADE✨'), 'Markserv could not upgrade.', flags)
// 		}
//
// 		msg(chalk.bgRed('✨UPGRADE✨'), 'Upgrade finished!', flags)
// 	})
// }

const optionalUpgrade = async flags => {
	if (flags.silent) {
		return
	}

	msg('upgrade', 'checking for upgrade...', flags)

	return checkForUpgrade(flags).then(async version => {
		if (version === false) {
			msg('upgrade', 'no upgrade available', flags)
			return
		}

		msg(chalk.bgRed('✨UPGRADE✨'), `Markserv version: ${version} is available!`, flags)

		const logInstallNotes = () => {
			msg(chalk.bgRed('✨UPGRADE✨'), 'Upgrade cancelled. To upgrade manually:', flags)
			msg(chalk.bgRed('✨UPGRADE✨'), chalk.bgYellow.black.bold(` npm i -g markserv@${version} `), flags)
			msg(chalk.bgRed('✨UPGRADE✨'), chalk.bgYellow.black.bold(` yarn global add markserv@${version} `), flags)
		}

		// For now, just log the install notes since promptly is not available
		logInstallNotes()
	}).catch(error => {
		console.error(error)
	})
}

const init = async flags => {
	const liveReloadPort = flags.livereloadport
	const httpPort = flags.port

	const httpRequestHandler = createRequestHandler(flags)

	// First, determine the actual LiveReload port if needed
	let actualLiveReloadPort = liveReloadPort
	let liveReloadServer
	if (liveReloadPort && liveReloadPort !== 'false') {
		const lrResult = await startLiveReloadServer(liveReloadPort, flags)
		liveReloadServer = lrResult
		actualLiveReloadPort = lrResult.port
	}

	// Create Express app with the actual LiveReload port
	const expressApp = startExpressApp(actualLiveReloadPort, httpRequestHandler)

	// Start HTTP server with automatic port finding
	const httpResult = await startHTTPServer(expressApp, httpPort, flags)
	const actualHttpPort = httpResult.port
	const httpServer = httpResult.server

	const serveURL = 'http://' + flags.address + ':' + actualHttpPort

	// Log server info to CLI with actual ports
	logActiveServerInfo(serveURL, actualHttpPort, actualLiveReloadPort, flags)

	let launchUrl = false
	if (flags.$openLocation || flags.$pathProvided) {
		launchUrl = serveURL + '/' + flags.$openLocation
	}

	// Update flags with actual ports for other functions to use
	flags.port = actualHttpPort
	if (liveReloadPort && liveReloadPort !== 'false') {
		flags.livereloadport = actualLiveReloadPort
	}

	const service = {
		pid: process.pid,
		httpServer,
		liveReloadServer,
		expressApp: httpServer, // Express app is embedded in the httpServer
		launchUrl
	}

	const launchBrowser = () => {
		if (flags.browser === false ||
			flags.browser === 'false') {
			return
		}

		if (launchUrl) {
			open(launchUrl)
		}
	}

	// Only check for upgrades when online
	isOnline({timeout: 5}).then(() => {
		optionalUpgrade(flags)
	})
	launchBrowser()

	return service
}

export default {
	getFile,
	markdownToHTML,
	init
}
