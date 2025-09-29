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
import mime from 'mime-types'
import multer from 'multer'
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

const formatFileSize = (bytes) => {
	if (bytes === 0) return '0 Bytes'
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100  } ${  sizes[i]}`
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
			const id = `mermaid-${  Math.random().toString(36).substr(2, 9)}`
			return `<div class="mermaid" id="${id}">${md.utils.escapeHtml(content)}</div>\n`
		}

		// Handle MLIR code blocks
		if (info === 'mlir') {
			const content = token.content.trim()
			return mlirToHTML(content)
		}

		// Handle diff/patch code blocks
		if (info === 'diff' || info === 'patch') {
			const content = token.content.trim()
			return diffToHTML(content)
		}

		return defaultRender(tokens, idx, options, env, renderer)
	}
}

// Text to HTML conversion function with syntax highlighting
const textToHTML = (text, filePath = '') => {
	// Escape HTML characters
	const escapeHtml = str => str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')

	// Map file extensions to highlight.js language codes
	const extensionToLanguage = {
		'.js': 'javascript',
		'.mjs': 'javascript',
		'.jsx': 'javascript',
		'.ts': 'typescript',
		'.tsx': 'typescript',
		'.py': 'python',
		'.pyw': 'python',
		'.c': 'c',
		'.h': 'c',
		'.cpp': 'cpp',
		'.cc': 'cpp',
		'.cxx': 'cpp',
		'.hpp': 'cpp',
		'.hxx': 'cpp',
		'.java': 'java',
		'.cs': 'csharp',
		'.php': 'php',
		'.rb': 'ruby',
		'.go': 'go',
		'.rs': 'rust',
		'.kt': 'kotlin',
		'.swift': 'swift',
		'.m': 'objectivec',
		'.mm': 'objectivec',
		'.scala': 'scala',
		'.sh': 'bash',
		'.bash': 'bash',
		'.zsh': 'bash',
		'.fish': 'bash',
		'.ps1': 'powershell',
		'.r': 'r',
		'.R': 'r',
		'.sql': 'sql',
		'.html': 'html',
		'.htm': 'html',
		'.xml': 'xml',
		'.css': 'css',
		'.scss': 'scss',
		'.sass': 'scss',
		'.less': 'less',
		'.json': 'json',
		'.yaml': 'yaml',
		'.yml': 'yaml',
		'.toml': 'toml',
		'.ini': 'ini',
		'.cfg': 'ini',
		'.conf': 'apache',
		'.dockerfile': 'dockerfile',
		'.Dockerfile': 'dockerfile',
		'.makefile': 'makefile',
		'.Makefile': 'makefile',
		'.mk': 'makefile',
		'.lua': 'lua',
		'.pl': 'perl',
		'.pm': 'perl',
		'.dart': 'dart',
		'.elm': 'elm',
		'.ex': 'elixir',
		'.exs': 'elixir',
		'.erl': 'erlang',
		'.hrl': 'erlang',
		'.fs': 'fsharp',
		'.fsx': 'fsharp',
		'.fsi': 'fsharp',
		'.ml': 'ocaml',
		'.mli': 'ocaml',
		'.pas': 'pascal',
		'.pp': 'pascal',
		'.clj': 'clojure',
		'.cljs': 'clojure',
		'.cljc': 'clojure',
		'.lisp': 'lisp',
		'.lsp': 'lisp',
		'.l': 'lisp',
		'.cl': 'lisp',
		'.jl': 'julia',
		'.vim': 'vim',
		'.vimrc': 'vim',
		'.nix': 'nix',
		'.asm': 'x86asm',
		'.s': 'armasm',
		'.S': 'armasm',
		'.v': 'verilog',
		'.sv': 'verilog',
		'.vhd': 'vhdl',
		'.vhdl': 'vhdl',
		'.proto': 'protobuf',
		'.cmake': 'cmake',
		'.gradle': 'gradle',
		'.groovy': 'groovy',
		'.properties': 'properties',
		'.bat': 'dos',
		'.cmd': 'dos',
		'.awk': 'awk',
		'.sed': 'sed'
	}

	// Determine the language based on file extension
	let language = 'plaintext'
	if (filePath) {
		const ext = path.extname(filePath).toLowerCase()
		language = extensionToLanguage[ext] || 'plaintext'

		// Special case for files without extension but with specific names
		const basename = path.basename(filePath).toLowerCase()
		if (basename === 'dockerfile') language = 'dockerfile'
		if (basename === 'makefile') language = 'makefile'
		if (basename === 'cmakelists.txt') language = 'cmake'
	}

	// Wrap text in pre/code tags with language class for syntax highlighting
	const escapedText = escapeHtml(text)
	return `<pre><code class="language-${language} hljs">${escapedText}</code></pre>`
}

// Log file to HTML conversion function with color highlighting
const logToHTML = logText => {
	// Escape HTML characters
	const escapeHtml = str => str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')

	// Process each line with enhanced formatting
	const lines = logText.split('\n')
	const highlightedLines = lines.map(line => {
		if (!line.trim()) return '' // Preserve empty lines

		const escapedLine = escapeHtml(line)

		// Parse structured log format: timestamp | LEVEL | message
		const structuredLogPattern = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s*\|\s*(\w+)\s*\|\s*(.*)$/
		const structuredMatch = line.match(structuredLogPattern)

		if (structuredMatch) {
			const [, timestamp, level, message] = structuredMatch
			const escapedTimestamp = escapeHtml(timestamp)
			const escapedLevel = escapeHtml(level.toUpperCase())
			const escapedMessage = escapeHtml(message)

			// Style based on log level
			let levelColor, messageColor, bgStyle = ''

			switch(escapedLevel) {
				case 'ERROR':
				case 'FATAL':
				case 'CRITICAL':
					levelColor = '#ffffff'
					messageColor = '#ff6b6b'
					bgStyle = 'background: rgba(220, 53, 69, 0.3); padding: 2px 6px; border-radius: 3px;'
					break
				case 'WARNING':
				case 'WARN':
					levelColor = '#ffa94d'
					messageColor = '#ffa94d'
					break
				case 'INFO':
				case 'INFORMATION':
					levelColor = '#74c0fc'
					messageColor = '#a5d8ff'
					break
				case 'SUCCESS':
				case 'OK':
					levelColor = '#51cf66'
					messageColor = '#8ce99a'
					break
				case 'DEBUG':
				case 'TRACE':
					levelColor = '#868e96'
					messageColor = '#868e96'
					break
				default:
					levelColor = '#ced4da'
					messageColor = '#ced4da'
			}

			return `<span style="color: #495057;">${escapedTimestamp}</span> | <span style="color: ${levelColor}; font-weight: 600; ${bgStyle}">${escapedLevel.padEnd(8)}</span> | <span style="color: ${messageColor};">${escapedMessage}</span>`
		}

		// Alternative format: [timestamp] [LEVEL] message
		const bracketPattern = /^(\[[\d\-\:\.\s]+\])\s*\[(\w+)\]\s*(.*)$/
		const bracketMatch = line.match(bracketPattern)

		if (bracketMatch) {
			const [, timestamp, level, message] = bracketMatch
			const escapedTimestamp = escapeHtml(timestamp)
			const escapedLevel = escapeHtml(level.toUpperCase())
			const escapedMessage = escapeHtml(message)

			let levelColor, messageColor

			switch(escapedLevel) {
				case 'ERROR':
				case 'FATAL':
				case 'CRITICAL':
					levelColor = '#ff6b6b'
					messageColor = '#ff6b6b'
					break
				case 'WARNING':
				case 'WARN':
					levelColor = '#ffa94d'
					messageColor = '#ffa94d'
					break
				case 'INFO':
					levelColor = '#74c0fc'
					messageColor = '#a5d8ff'
					break
				case 'SUCCESS':
					levelColor = '#51cf66'
					messageColor = '#8ce99a'
					break
				case 'DEBUG':
				case 'TRACE':
					levelColor = '#868e96'
					messageColor = '#868e96'
					break
				default:
					levelColor = '#ced4da'
					messageColor = '#ced4da'
			}

			return `<span style="color: #495057;">${escapedTimestamp}</span> <span style="color: ${levelColor}; font-weight: 600;">[${escapedLevel}]</span> <span style="color: ${messageColor};">${escapedMessage}</span>`
		}

		// Fallback patterns for unstructured logs
		// ERROR/FATAL/CRITICAL - Red with background
		if (/\b(ERROR|FATAL|FAILURE|FAILED|CRITICAL)\b/i.test(line)) {
			return `<span style="color: #ff6b6b; background: rgba(220, 53, 69, 0.2); padding: 2px 4px; border-radius: 3px; display: inline-block; width: 100%;">${escapedLine}</span>`
		}
		// WARNING/WARN - Orange
		if (/\b(WARNING|WARN|CAUTION)\b/i.test(line)) {
			return `<span style="color: #ffa94d;">${escapedLine}</span>`
		}
		// INFO - Blue
		if (/\b(INFO|INFORMATION|NOTICE)\b/i.test(line)) {
			return `<span style="color: #74c0fc;">${escapedLine}</span>`
		}
		// SUCCESS - Green
		if (/\b(SUCCESS|SUCCESSFUL|OK|PASS|PASSED|COMPLETE|COMPLETED)\b/i.test(line)) {
			return `<span style="color: #51cf66;">${escapedLine}</span>`
		}
		// DEBUG/TRACE - Gray
		if (/\b(DEBUG|TRACE|VERBOSE)\b/i.test(line)) {
			return `<span style="color: #868e96;">${escapedLine}</span>`
		}
		// Stack traces - Purple/Pink
		if (/^\s+at\s+/.test(line)) {
			return `<span style="color: #e599f7;">${escapedLine}</span>`
		}
		// File paths and line numbers
		if (/\.(js|ts|py|java|cpp|c|go|rs|rb|php):\d+/.test(line)) {
			return `<span style="color: #fcc2d7;">${escapedLine}</span>`
		}

		// Default - subtle gray
		return `<span style="color: #adb5bd;">${escapedLine}</span>`
	})

	// Terminal-style container with enhanced styling
	return `<div style="
		background: #1a1b26;
		border-radius: 8px;
		padding: 16px;
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 13px;
		line-height: 1.6;
		overflow-x: auto;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
		border: 1px solid #2d2e3f;
	">
		<div style="
			border-bottom: 1px solid #2d2e3f;
			padding-bottom: 8px;
			margin-bottom: 12px;
			color: #565869;
			font-size: 11px;
			display: flex;
			align-items: center;
			justify-content: space-between;
		">
			<span>📄 ${logText.split('\n').length} lines</span>
			<span style="color: #3b3c4f;">Log Output</span>
		</div>
		<pre style="margin: 0; padding: 0; background: transparent; overflow-x: auto;"><code style="display: block; color: #c0caf5; background: transparent;">${highlightedLines.join('\n')}</code></pre>
	</div>`
}

// Diff to HTML conversion function
const diffToHTML = diffText => {
	// Escape HTML characters
	const escapeHtml = str => str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')

	// Split into lines for processing
	const lines = diffText.split('\n')
	let highlighted = ''

	for (const line of lines) {
		let processedLine = escapeHtml(line)
		let lineClass = ''

		if (line.startsWith('+++') || line.startsWith('---')) {
			// File headers
			lineClass = 'hljs-meta'
		} else if (line.startsWith('@@')) {
			// Hunk headers
			lineClass = 'hljs-section'
			// Highlight line numbers within @@ markers
			processedLine = processedLine.replace(/@@ ([^@]+) @@/, (match, content) => {
				return `<span class="hljs-section">@@ <span class="hljs-number">${content}</span> @@</span>`
			})
		} else if (line.startsWith('+')) {
			// Added lines
			lineClass = 'hljs-addition'
		} else if (line.startsWith('-')) {
			// Removed lines
			lineClass = 'hljs-deletion'
		} else if (line.startsWith('diff ')) {
			// Diff command line
			lineClass = 'hljs-keyword'
		} else if (line.startsWith('index ')) {
			// Index line
			lineClass = 'hljs-comment'
		} else if (line.startsWith('Binary files')) {
			// Binary file notice
			lineClass = 'hljs-comment'
		} else if (line.startsWith('new file mode') || line.startsWith('deleted file mode') || line.startsWith('old mode') || line.startsWith('new mode')) {
			// File mode changes
			lineClass = 'hljs-attribute'
		} else if (line.startsWith('rename from') || line.startsWith('rename to') || line.startsWith('similarity index')) {
			// Rename information
			lineClass = 'hljs-attribute'
		} else {
			// Context lines (no prefix or space prefix)
			lineClass = ''
		}

		if (lineClass) {
			highlighted += `<span class="${lineClass}">${processedLine}</span>\n`
		} else {
			highlighted += `${processedLine}\n`
		}
	}

	// Wrap in pre and code tags with appropriate classes
	return `<pre><code class="language-diff hljs">${highlighted}</code></pre>`
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

	diff: [
		'.diff',
		'.patch'
	],

	text: [
		'.txt',
		'.log',
		'.conf',
		'.cfg',
		'.ini',
		'.yaml',
		'.yml',
		'.toml',
		'.json',
		'.xml',
		'.csv',
		'.tsv',
		'.sh',
		'.bash',
		'.zsh',
		'.fish',
		'.py',
		'.js',
		'.ts',
		'.jsx',
		'.tsx',
		'.java',
		'.c',
		'.cpp',
		'.h',
		'.hpp',
		'.cs',
		'.go',
		'.rs',
		'.swift',
		'.kt',
		'.rb',
		'.php',
		'.sql',
		'.r',
		'.m',
		'.mm',
		'.pl',
		'.pm',
		'.lua',
		'.vim',
		'.env',
		'.gitignore',
		'.dockerignore',
		'.editorconfig',
		'.eslintrc',
		'.prettierrc'
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

	// Directories and patterns to exclude from file watching and processing
	// Ordered by frequency of occurrence for optimal performance
	exclusions: [
		// Package manager directories (most common)
		'node_modules/',
		'.pnpm/',
		'.yarn/',

		// Version control systems
		'.git/',
		'.svn/',
		'.hg/',

		// Build output directories
		'.dist/',
		'dist/',
		'build/',
		'.build/',
		'out/',
		'.out/',
		'target/',

		// Cache and temporary directories
		'.cache/',
		'.temp/',
		'.tmp/',
		'temp/',
		'tmp/',

		// IDE and editor directories
		'.vscode/',
		'.idea/',
		'.vs/',

		// OS-specific directories
		'.DS_Store',
		'Thumbs.db',
		'__pycache__/',
		'.pytest_cache/',

		// Log directories
		'logs/',
		'.log/',

		// Coverage and test output
		'coverage/',
		'.nyc_output/',
		'.coverage/',

		// Dependency lock files and configs that shouldn't be watched
		'*.lock',
		'*.log'
	]
}

// Enhanced exclusion pattern matching with error handling
const isExcluded = (filePath, exclusions = fileTypes.exclusions) => {
	if (!filePath || typeof filePath !== 'string') {
		return false
	}

	// Normalize path separators for cross-platform compatibility
	const normalizedPath = filePath.replace(/\\/g, '/')

	return exclusions.some(pattern => {
		try {
			// Handle glob patterns
			if (pattern.includes('*')) {
				// Simple glob matching for *.ext patterns
				if (pattern.startsWith('*.')) {
					const ext = pattern.slice(1) // Remove the *
					return normalizedPath.endsWith(ext)
				}
			}

			// Handle directory patterns (ending with /)
			if (pattern.endsWith('/')) {
				return normalizedPath.includes(`/${pattern}`) ||
				       normalizedPath.startsWith(pattern) ||
				       normalizedPath.includes(`/${pattern.slice(0, -1)}/`)
			}

			// Handle exact file matches
			return normalizedPath.endsWith(`/${pattern}`) ||
			       normalizedPath === pattern ||
			       normalizedPath.includes(`/${pattern}`)

		} catch (error) {
			console.warn(`Error matching exclusion pattern "${pattern}" against "${filePath}":`, error.message)
			return false
		}
	})
}

// Validate exclusion patterns on startup
const validateExclusions = (exclusions) => {
	const invalid = []
	const valid = []

	exclusions.forEach(pattern => {
		if (typeof pattern !== 'string' || pattern.length === 0) {
			invalid.push(pattern)
		} else if (pattern.includes('..') || pattern.includes('//')) {
			// Prevent path traversal patterns
			invalid.push(pattern)
		} else {
			valid.push(pattern)
		}
	})

	if (invalid.length > 0) {
		console.warn('Invalid exclusion patterns detected:', invalid)
	}

	return valid
}

// Initialize validated exclusions
fileTypes.exclusions = validateExclusions(fileTypes.exclusions)

fileTypes.watch = fileTypes.watch
	.concat(fileTypes.markdown)
	.concat(fileTypes.html)
	.concat(fileTypes.diff)
	.concat(fileTypes.text)

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
		return log(`${chalk.bgYellow.black('    GitHub  ')  } ${  msg}`, flags)
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
	let fileCount = 0
	let folderCount = 0

	let prettyPath = `/${  path.relative(process.cwd(), filePath)}`
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

		const fullPath = path.join(filePath, subPath)
		const dir = fs.statSync(fullPath).isDirectory()
		let href
		let displayName

		// Properly encode the URL to handle special characters
		// encodeURIComponent encodes all special characters including @ symbols
		const encodedPath = encodeURIComponent(subPath)

		// For display, we want to show the actual filename with special characters
		// but escape HTML to prevent injection
		const escapeHtml = str => str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;')

		if (dir) {
			href = `${encodedPath}/`
			displayName = `🗂️ ${escapeHtml(subPath)}/`
			list += `\t<li class="icon folder isfolder" title="Directory"><a href="${href}">${displayName}</a></li>\n`
			folderCount++
		} else {
			href = encodedPath
			displayName = `📝 ${escapeHtml(subPath)}`
			const iconClass = lookUpIconClass(subPath, 'file')
			list += `\t<li class="icon ${iconClass} isfile" title="File"><a href="${href}">${displayName}</a></li>\n`
			fileCount++
		}
	})

	list += '</ul>\n'

	// Return an object with both HTML and counts
	return {
		html: list,
		fileCount,
		folderCount
	}
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
		const fullLink = `${collectPath + urlParts[i]  }/`

		const crumb = {
			href: fullLink,
			text: `${dirName  }/`
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
		// Properly decode the URL - decodeURIComponent handles special characters better than unescape
		const decodedUrl = getPathFromUrl(decodeURIComponent(req.originalUrl))
		// Don't use unescape as it's deprecated and doesn't handle special characters well
		const filePath = path.normalize(path.join(dir, decodedUrl))
		const baseDir = path.parse(filePath).dir
		implantOpts.baseDir = baseDir

		const errorPage = (code, filePath, err) => {
			errormsg(code, filePath, flags, err)

			const templateUrl = path.join(__dirname, 'templates/error.html')
			const fileName = path.parse(filePath).base
			// Use decodeURIComponent instead of deprecated unescape
			const referer = req.headers.referer ?
				decodeURIComponent(req.headers.referer) :
				`${path.parse(decodedUrl).dir}/`
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

		// Make prettyPath relative to the base directory for URL generation
		const prettyPath = `/${path.relative(flags.dir || process.cwd(), filePath)}`

		let stat
		let isDir
		let isMarkdown
		let isHtml
		let isMLIR
		let isDiff
		let isText

		try {
			stat = fs.statSync(filePath)
			isDir = stat.isDirectory()
			if (!isDir) {
				isMarkdown = isType(fileTypes.markdown, filePath)
				isHtml = isType(fileTypes.html, filePath)
				isMLIR = isType(fileTypes.mlir, filePath)
				isDiff = isType(fileTypes.diff, filePath)
				isText = isType(fileTypes.text, filePath)
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

		// Check if this is a download request for any file type
		if (req.url.includes('download=true') && !isDir) {
			const fileName = path.basename(filePath)
			const mimeType = mime.lookup(filePath)

			res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
			if (mimeType) {
				res.setHeader('Content-Type', mimeType)
			}

			const stream = fs.createReadStream(filePath)
			stream.on('error', () => {
				res.status(404).end()
			})
			stream.pipe(res)
			return
		}

		// Markdown: Browser is requesting a Markdown file
		if (isMarkdown) {
			msg('markdown', style.link(prettyPath), flags)
			getFile(filePath).then(markdownToHTML).then(filePath).then(html => {
				return processTemplate(html, implantHandlers, implantOpts).then(output => {
					const templateUrl = path.join(__dirname, 'templates/markdown.html')

					const stats = fs.statSync(filePath)
					const lastModified = stats.mtime.toLocaleString('en-US', {
						year: 'numeric',
						month: 'short',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit'
					})

					const handlebarData = {
						title: path.parse(filePath).base,
						content: output,
						pid: process.pid | 'N/A',
						filePath: prettyPath,
						fileName: path.basename(filePath),
						lastModified
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
		} else if (isDiff) {
			// Diff: Browser is requesting a diff or patch file
			msg('diff', style.link(prettyPath), flags)
			getFile(filePath).then(diffContent => {
				const htmlContent = diffToHTML(diffContent)
				const templateUrl = path.join(__dirname, 'templates/markdown.html')

				const stats = fs.statSync(filePath)
				const lastModified = stats.mtime.toLocaleString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})

				const handlebarData = {
					title: path.parse(filePath).base,
					content: htmlContent,
					pid: process.pid | 'N/A',
					filePath: prettyPath,
					fileName: path.basename(filePath),
					lastModified
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
		} else if (isMLIR) {
			// MLIR: Browser is requesting an MLIR file
			msg('mlir', style.link(prettyPath), flags)
			getFile(filePath).then(mlirContent => {
				const htmlContent = mlirToHTML(mlirContent)
				const templateUrl = path.join(__dirname, 'templates/markdown.html')

				const stats = fs.statSync(filePath)
				const lastModified = stats.mtime.toLocaleString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})

				const handlebarData = {
					title: path.parse(filePath).base,
					content: htmlContent,
					pid: process.pid | 'N/A',
					filePath: prettyPath,
					fileName: path.basename(filePath),
					lastModified
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
			// Handle file upload for directories
			if (req.method === 'POST' && req.url.includes('upload=true')) {
				// First, parse the multipart form to get all fields
				const upload = multer().any();

				upload(req, res, function (err) {
					if (err) {
						console.error('Upload error:', err)
						res.status(500).send('Upload failed: ' + err.message)
						return
					}

					// Find the file and relativePath from the parsed fields
					const fileField = req.files && req.files.find(f => f.fieldname === 'file');
					let relativePath = req.body && req.body.relativePath ? req.body.relativePath : '';

					if (!fileField) {
						res.status(400).send('No file uploaded')
						return
					}

					// Get the original filename - it may contain special characters
					let originalFilename = fileField.originalname;

					// For safety, we should validate that the path doesn't try to escape the upload directory
					// But we should preserve special characters that are valid in filenames
					const isPathSafe = (pathStr) => {
						// Check for path traversal attempts
						const normalized = path.normalize(pathStr);
						return !normalized.includes('..') && !path.isAbsolute(normalized);
					};

					// Validate paths
					if (relativePath && !isPathSafe(relativePath)) {
						console.error('Invalid relative path:', relativePath);
						res.status(400).send('Invalid path');
						return;
					}

					if (!isPathSafe(originalFilename)) {
						console.error('Invalid filename:', originalFilename);
						res.status(400).send('Invalid filename');
						return;
					}

					// Determine target directory
					let targetDir = filePath;
					let targetPath;

					try {
						if (relativePath) {
							// Create the subdirectory structure
							// Note: path.join handles special characters properly
							targetDir = path.join(filePath, relativePath);

							// Create all parent directories if they don't exist
							fs.mkdirSync(targetDir, { recursive: true });
						}

						// Save the file to the target directory
						// path.join properly handles special characters in filenames
						targetPath = path.join(targetDir, originalFilename);

						// Write the file
						fs.writeFile(targetPath, fileField.buffer, function(writeErr) {
							if (writeErr) {
								console.error('File write error:', writeErr);
								console.error('Target path was:', targetPath);
								res.status(500).send('Failed to save file: ' + writeErr.message);
								return;
							}

							const displayPath = relativePath ?
								`${relativePath}/${originalFilename}` :
								originalFilename;

							msg('upload', `${displayPath} -> ${style.link(prettyPath)}`, flags)
							res.status(200).send('File uploaded successfully')
						});
					} catch (mkdirError) {
						console.error('Directory creation error:', mkdirError);
						console.error('Target directory was:', targetDir);
						res.status(500).send('Failed to create directory: ' + mkdirError.message);
						return;
					}
				})
				return
			}

			try {
				// Index: Browser is requesting a Directory Index
				msg('dir', style.link(prettyPath), flags)

				const templateUrl = path.join(__dirname, 'templates/directory.html')

				const dirInfo = dirToHtml(filePath)

				// Format the counts text
				let countsText = ''
				if (dirInfo.fileCount > 0) {
					countsText += `${dirInfo.fileCount} file${dirInfo.fileCount !== 1 ? 's' : ''}`
				}
				if (dirInfo.folderCount > 0) {
					if (countsText) countsText += ', '
					countsText += `${dirInfo.folderCount} folder${dirInfo.folderCount !== 1 ? 's' : ''}`
				}
				if (!countsText) {
					countsText = 'Empty folder'
				}

				const handlebarData = {
					dirname: path.parse(filePath).dir,
					content: dirInfo.html,
					title: path.parse(filePath).base,
					pid: process.pid | 'N/A',
					breadcrumbs: createBreadcrumbs(path.relative(dir, filePath)),
					countsText
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
		} else if (isText) {
			// Text: Browser is requesting a text file
			msg('text', style.link(prettyPath), flags)
			getFile(filePath).then(textContent => {
				// Use logToHTML for .log files, textToHTML for others
				const isLogFile = path.extname(filePath).toLowerCase() === '.log'
				const htmlContent = isLogFile ? logToHTML(textContent) : textToHTML(textContent, filePath)
				const templateUrl = path.join(__dirname, 'templates/markdown.html')

				const stats = fs.statSync(filePath)
				const lastModified = stats.mtime.toLocaleString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})

				const handlebarData = {
					title: path.parse(filePath).base,
					content: htmlContent,
					pid: process.pid | 'N/A',
					filePath: prettyPath,
					fileName: path.basename(filePath),
					lastModified
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
		} else {
			// Check if file has text MIME type and should be rendered as text
			const mimeType = mime.contentType(path.extname(filePath))
			const isTextMime = mimeType && (mimeType.startsWith('text/') ||
				mimeType.includes('application/json') ||
				mimeType.includes('application/xml') ||
				mimeType.includes('application/javascript') ||
				mimeType.includes('application/x-sh'))

			if (isTextMime && req.headers.accept && req.headers.accept.includes('text/html')) {
				// Render any text MIME type file as formatted text
				msg('text (mime)', style.link(prettyPath), flags)
				getFile(filePath).then(textContent => {
					const htmlContent = textToHTML(textContent, filePath)
					const templateUrl = path.join(__dirname, 'templates/markdown.html')

					const stats = fs.statSync(filePath)
					const lastModified = stats.mtime.toLocaleString('en-US', {
						year: 'numeric',
						month: 'short',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit'
					})

					const handlebarData = {
						title: path.parse(filePath).base,
						content: htmlContent,
						pid: process.pid | 'N/A',
						filePath: prettyPath,
						fileName: path.basename(filePath),
						lastModified
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
				return
			}

			// Other: Browser requests other MIME typed file
			msg('file', style.link(prettyPath), flags)

			// Check if we should show a download page or serve directly
			const isDownloadable = !mimeType || !mimeType.startsWith('image/') && !mimeType.startsWith('video/') && !mimeType.startsWith('audio/')

			// For non-media files, show a download page
			if (isDownloadable && req.headers.accept && req.headers.accept.includes('text/html')) {
				const fileName = path.basename(filePath)
				const stats = fs.statSync(filePath)
				const fileSize = stats.size
				const fileSizeFormatted = formatFileSize(fileSize)
				const lastModified = stats.mtime.toLocaleString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})

				const downloadPageHtml = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${fileName}</title>
	<link rel="stylesheet" href="{markserv}templates/markserv.css">
	<style>
		.download-container {
			max-width: 800px;
			margin: 50px auto;
			padding: 30px;
			text-align: center;
		}
		.file-info {
			background: #f5f5f5;
			border-radius: 8px;
			padding: 20px;
			margin: 20px 0;
		}
		.download-button {
			display: inline-block;
			padding: 12px 30px;
			background: #0366d6;
			color: white;
			text-decoration: none;
			border-radius: 6px;
			font-size: 16px;
			transition: background 0.2s;
		}
		.download-button:hover {
			background: #0256c7;
		}
		.file-icon {
			font-size: 64px;
			margin: 20px 0;
		}
	</style>
</head>
<body>
	<article class="markdown-body">
		<div class="download-container">
			<div class="file-icon">📄</div>
			<h1>${fileName}</h1>
			<div class="file-info">
				<p><strong>File Type:</strong> ${mimeType || 'Unknown'}</p>
				<p><strong>File Size:</strong> ${fileSizeFormatted}</p>
				<p><strong>Last Modified:</strong> ${lastModified}</p>
			</div>
			<a href="${req.url}?download=true" class="download-button" download="${fileName}">⬇ Download File</a>
		</div>
		<footer><sup><hr> PID: ${process.pid}</sup></footer>
	</article>
</body>
</html>`
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
				res.end(downloadPageHtml)
			} else {
				// Serve the file directly (for images, videos, audio, or when download=true is in query)
				if (mimeType) {
					res.setHeader('Content-Type', mimeType)
				}
				// Add download header if requested
				if (req.url.includes('download=true')) {
					res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`)
				}
				const stream = fs.createReadStream(filePath)
				stream.on('error', () => {
					res.status(404).end()
				})
				stream.pipe(res)
			}
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
			const actualPort = httpServer.address().port
			resolve({ server: httpServer, port: actualPort })
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

	// Try to create WebSocket server for live reload with port conflict handling
	let actualPort = liveReloadPort
	let wss

	// First check if the port is available
	const portAvailable = await checkPortAvailable(liveReloadPort, '::')

	if (!portAvailable) {
		msg('livereload', chalk.yellow(`LiveReload port ${liveReloadPort} is already in use, finding an available port...`), flags)
		try {
			actualPort = await findAvailablePort(liveReloadPort + 1, '::', 10)
			msg('livereload', chalk.green(`Using LiveReload port ${actualPort} instead`), flags)
		} catch (findErr) {
			errormsg('livereload', `Could not find available port for LiveReload: ${findErr.message}`, flags, findErr)
			// Return a dummy object so the server can still start without LiveReload
			return { wss: null, watcher: null, port: 0 }
		}
	}

	// Create the WebSocket server with the available port
	wss = new WebSocketServer({ port: actualPort })

	// Handle any runtime errors
	wss.on('error', (err) => {
		errormsg('livereload', `LiveReload server error: ${err.message}`, flags, err)
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

	const githubLink = 'github.com/litanlitudan/markserv'

	msg('address', style.address(serveURL), flags)
	msg('path', chalk.grey(style.address(dir)), flags)
	msg('livereload', chalk.grey(`communicating on port: ${  style.port(liveReloadPort)}`), flags)

	if (process.pid) {
		msg('process', chalk.grey(`your pid is: ${  style.pid(process.pid)}`), flags)
		msg('stop', chalk.grey(`press ${  chalk.magenta('[Ctrl + C]')  } or type ${  chalk.magenta(`"sudo kill -9 ${process.pid}"`)}`), flags)
	}

	msg('github', `Contribute on Github - ${  chalk.yellow.underline(githubLink)}`, flags)
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

	const serveURL = `http://${  flags.address  }:${  actualHttpPort}`

	// Log server info to CLI with actual ports
	logActiveServerInfo(serveURL, actualHttpPort, actualLiveReloadPort, flags)

	let launchUrl = false
	if (flags.$openLocation || flags.$pathProvided) {
		launchUrl = `${serveURL  }/${  flags.$openLocation}`
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
			msg('browser', `Opening browser at: ${launchUrl}`, flags)
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
