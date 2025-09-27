import chalk from 'chalk'

const msg = (type, msg) => {
	console.log(chalk.bgGreen.black('  Markserv  ') + chalk.white(` ${type}: `) + msg)
}

const splash = flags => {
	if (flags && flags.silent) {
		return
	}

	// Display ASCII art logo instead of image
	console.log(chalk.green(`
  ┌─┐┌─┐┌─┐┬  ┬┌─┐┌─┐┬  ┬
  │││├─┤├┬┘├┐┌┘└─┐├┤ ├┬┘└┐┌┘
  ┴ ┴┴ ┴┴└─┴ └ └─┘└─┘┴└─ └┘
  `))

	msg('boot', 'starting Markserv...')
}

export default splash
