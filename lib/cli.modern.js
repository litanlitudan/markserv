#!/usr/bin/env node

/**
 * @fileoverview Modern ES module CLI for markserv
 * @module markserv/cli
 */

import { fileURLToPath } from 'node:url'
import { dirname, join, normalize } from 'node:path'
import { readFile } from 'node:fs/promises'
import process from 'node:process'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'
import ora from 'ora'

import { init as initServer } from './server.modern.js'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Display splash screen
 */
async function displaySplash(flags) {
	if (flags.silent) return

	const splashPath = join(__dirname, 'splash.txt')
	try {
		const splash = await readFile(splashPath, 'utf-8')
		console.log(chalk.cyan(splash))
	} catch {
		// If splash file doesn't exist, show simple message
		console.log(chalk.cyan.bold('\n🏁 Markserv - Modern Markdown Server\n'))
	}
}

/**
 * Parse command line arguments
 */
function parseArguments() {
	return yargs(hideBin(process.argv))
		.scriptName('markserv')
		.usage('$0 [path] [options]')
		.positional('path', {
			describe: 'File or directory to serve',
			type: 'string',
			default: process.cwd(),
		})
		.option('port', {
			alias: 'p',
			type: 'number',
			default: 8642,
			describe: 'Port to serve on',
		})
		.option('address', {
			alias: 'a',
			type: 'string',
			default: 'localhost',
			describe: 'Address to bind to',
		})
		.option('livereloadport', {
			alias: 'l',
			type: 'number',
			default: 35729,
			describe: 'LiveReload port (false to disable)',
		})
		.option('browser', {
			alias: 'b',
			type: 'boolean',
			default: true,
			describe: 'Open in browser',
		})
		.option('silent', {
			alias: 's',
			type: 'boolean',
			default: false,
			describe: 'Silent mode',
		})
		.option('verbose', {
			alias: 'v',
			type: 'boolean',
			default: false,
			describe: 'Verbose logging',
		})
		.option('no-livereload', {
			type: 'boolean',
			default: false,
			describe: 'Disable LiveReload',
		})
		.help('h')
		.alias('h', 'help')
		.version()
		.alias('version', 'V')
		.example('$0', 'Serve current directory')
		.example('$0 README.md', 'Serve specific file')
		.example('$0 docs/', 'Serve directory')
		.example('$0 -p 3000', 'Use custom port')
		.example('$0 --no-browser', "Don't open browser")
		.epilogue('For more information, visit https://github.com/markserv/markserv')
		.parse()
}

/**
 * Validate and normalize server path
 */
function validateServerPath(serverPath, cwd) {
	// If no path provided, use current directory
	if (!serverPath || serverPath === '.') {
		return cwd
	}

	// Handle absolute paths
	if (serverPath.startsWith('/')) {
		return normalize(serverPath)
	}

	// Handle relative paths
	return normalize(join(cwd, serverPath))
}

/**
 * Main CLI function
 */
async function main() {
	const spinner = ora()

	try {
		// Parse arguments
		const args = await parseArguments()

		// Prepare flags
		const flags = {
			port: args.port,
			address: args.address,
			livereloadport: args.noLivereload ? false : args.livereloadport,
			browser: args.browser,
			silent: args.silent,
			verbose: args.verbose,
			dir: validateServerPath(args._[0] || args.path, process.cwd()),
			$pathProvided: !!args._[0],
			$openLocation: !!args._[0],
		}

		// Display splash
		await displaySplash(flags)

		// Start server with spinner
		if (!flags.silent) {
			spinner.start('Starting Markserv...')
		}

		// Initialize server
		const service = await initServer(flags)

		if (!flags.silent) {
			spinner.succeed('Markserv started successfully!')

			// Display server info
			console.log(chalk.green('\n📍 Server Information:'))
			console.log(chalk.white(`   Address: ${chalk.cyan.underline(`http://${flags.address}:${flags.port}`)}`))
			console.log(chalk.white(`   Path: ${chalk.gray(flags.dir)}`))

			if (flags.livereloadport !== false) {
				console.log(chalk.white(`   LiveReload: ${chalk.gray(`Port ${flags.livereloadport}`)}`))
			}

			console.log(chalk.white(`   Process ID: ${chalk.cyan(process.pid)}`))
			console.log(
				chalk.yellow(`\n   Press ${chalk.magenta('Ctrl+C')} to stop the server\n`)
			)
		}

		// Handle graceful shutdown
		process.on('SIGINT', async () => {
			if (!flags.silent) {
				console.log(chalk.yellow('\n\n👋 Shutting down Markserv...'))
			}

			if (service && service.stop) {
				await service.stop()
			}

			process.exit(0)
		})

		process.on('SIGTERM', async () => {
			if (service && service.stop) {
				await service.stop()
			}
			process.exit(0)
		})

		// Keep process alive
		process.stdin.resume()
	} catch (error) {
		spinner.fail('Failed to start Markserv')
		console.error(chalk.red('\n❌ Error:'), error.message)

		if (error.code === 'EADDRINUSE') {
			console.error(
				chalk.yellow(
					`\n💡 Port ${error.port || 'specified'} is already in use. Try a different port with -p flag.`
				)
			)
		}

		process.exit(1)
	}
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
	console.error(chalk.red('Uncaught Exception:'), error)
	process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
	console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason)
	process.exit(1)
})

// Run CLI
main().catch((error) => {
	console.error(chalk.red('Fatal error:'), error)
	process.exit(1)
})