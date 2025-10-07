# Markserv Installation Guide

## Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)
- Git

## Installation Steps

```shell
# Clone the repository
$ git clone https://github.com/litanlitudan/markserv.git

# Navigate to the markserv directory
$ cd markserv

# Install dependencies
$ npm install

# Build the project
$ npm run build

# Link the package globally to use 'markserv' command
$ npm link
```

## Running the Server

```shell
# Basic usage - serve current directory
$ markserv

# Serve specific directory or file
$ markserv path/to/docs

# Advanced usage with custom port and network access
$ markserv path/to/docs -p 8642 -a 0.0.0.0
```

### Command Options
- `-p 8642` - Sets the server port to 8642 (default: 8008)
- `-a 0.0.0.0` - Makes the server accessible from external networks (default: localhost)
- `-s` - Silent mode (minimal output)
- `-v` - Verbose mode (detailed output)
- `-w` - Enable file watching for live reload

## Features
- 📝 Renders Markdown files as HTML with GitHub-style CSS
- 📁 Beautiful directory listing with file icons
- 🔄 Live reload support (requires browser extension)
- 🎨 Syntax highlighting for code blocks
- 📊 Support for Mermaid diagrams
- 🔢 MathJax support for mathematical expressions
- 🌐 Network accessible for sharing documentation

## Common Use Cases

### Local Documentation Server
```shell
# Serve your project's documentation
$ markserv ./docs -p 3000
```

### Remote Access for Team Sharing
```shell
# Make documentation available to your network
$ markserv ./docs -p 8642 -a 0.0.0.0
```

### Keep Server Running in Background
```shell
# Run server as a background process (Unix/Linux/macOS)
$ nohup markserv ./docs -p 8642 -a 0.0.0.0 &
```

## Troubleshooting

### Port Already in Use
If you see an error about the port being in use, try a different port:
```shell
$ markserv -p 3001
```

### External Access Not Working
Ensure your firewall allows connections on the specified port and use `-a 0.0.0.0`:
```shell
$ markserv -p 8642 -a 0.0.0.0
```