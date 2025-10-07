/**
 * MLIR to Model Explorer Graph Converter
 *
 * This module converts MLIR (Multi-Level Intermediate Representation) text
 * into a graph format compatible with Google's Model Explorer visualization tool.
 */

export interface GraphNode {
	id: string
	label: string
	namespace: string
	attrs: Array<{key: string; value: string}>
	incomingEdges: Array<{
		sourceNodeId: string
		sourceNodeOutputId?: string
		targetNodeInputId?: string
	}>
}

export interface ModelExplorerGraph {
	id: string
	nodes: GraphNode[]
}

/**
 * Convert MLIR text to Model Explorer graph format
 * @param mlirContent The MLIR text content to parse
 * @param filename The filename to use as the graph ID
 * @returns A graph object compatible with Model Explorer
 */
export function convertMLIRToGraph(mlirContent: string, filename: string): ModelExplorerGraph {
	const nodes: GraphNode[] = []
	const ssaToNodeId = new Map<string, string>() // Map SSA values to node IDs

	// Parse MLIR operations and create nodes
	const lines = mlirContent.split('\n')
	let nodeId = 0
	let inFunctionBody = false

	lines.forEach((line, index) => {
		const trimmedLine = line.trim()

		// Skip empty lines, comments, and location metadata
		if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#loc')) return

		// Skip module attributes line
		if (trimmedLine.startsWith('module attributes')) return

		let label = trimmedLine
		let namespace = 'default'
		let ssaValue: string | null = null
		const currentNodeId = `node_${nodeId}`
		const incomingEdges: GraphNode['incomingEdges'] = []

		// Handle function definitions
		if (trimmedLine.includes('func.func') || trimmedLine.includes('func @')) {
			const funcMatch = trimmedLine.match(/@([\w.]+)/)
			label = funcMatch ? `${funcMatch[1]}` : 'function'
			namespace = 'function'
			inFunctionBody = true

			// Extract function arguments
			const argsMatch = trimmedLine.match(/\(([^)]+)\)/)
			if (argsMatch) {
				const args = argsMatch[1]
				// Extract argument names like %arg0, %arg1
				const argMatches = args.matchAll(/(%arg\d+)/g)
				for (const match of argMatches) {
					ssaToNodeId.set(match[1], currentNodeId)
				}
			}
		}
		// Handle SSA value definitions with various dialects (stablehlo, arith, etc.)
		else if (trimmedLine.includes('=') && inFunctionBody) {
			// More flexible SSA value and operation matching
			// Matches patterns like: %0 = stablehlo.cosine %arg0
			const ssaMatch = trimmedLine.match(/^(%[\w.]+)\s*=\s*([\w.]+)\s+(.*)/)
			if (ssaMatch) {
				ssaValue = ssaMatch[1]
				const operation = ssaMatch[2]
				label = operation
				namespace = 'op'

				// Extract the rest of the line after the operation
				const operandsPart = ssaMatch[3]

				// Find all SSA values in the operands (anything starting with %)
				const ssaOperands = operandsPart.matchAll(/%[\w.]+/g)
				for (const match of ssaOperands) {
					const operandName = match[0]
					const sourceNodeId = ssaToNodeId.get(operandName)
					if (sourceNodeId) {
						incomingEdges.push({
							sourceNodeId: sourceNodeId
						})
					}
				}
			}
		}
		// Handle module declaration
		else if (trimmedLine.startsWith('module')) {
			label = 'module'
			namespace = 'module'
		}
		// Handle return statements
		else if (trimmedLine.includes('return')) {
			label = 'return'
			namespace = 'control'
			inFunctionBody = false

			// Extract returned SSA values
			const returnedValues = trimmedLine.matchAll(/%[\w.]+/g)
			for (const match of returnedValues) {
				const returnValue = match[0]
				const sourceNodeId = ssaToNodeId.get(returnValue)
				if (sourceNodeId) {
					incomingEdges.push({
						sourceNodeId: sourceNodeId
					})
				}
			}
		}
		// Handle closing braces
		else if (trimmedLine === '}') {
			// Skip closing braces - they're not operations
			return
		}

		// Limit label length
		if (label.length > 50) {
			label = label.substring(0, 47) + '...'
		}

		nodes.push({
			id: currentNodeId,
			label: label,
			namespace: namespace,
			attrs: [
				{ key: 'line', value: String(index + 1) },
				{ key: 'code', value: trimmedLine.substring(0, 200) }
			],
			incomingEdges: incomingEdges
		})

		// Map SSA value to node ID for edge creation
		if (ssaValue) {
			ssaToNodeId.set(ssaValue, currentNodeId)
		}

		nodeId++
	})

	// If no nodes were found, create a placeholder
	if (nodes.length === 0) {
		nodes.push({
			id: 'node_0',
			label: 'Empty MLIR File',
			namespace: 'default',
			attrs: [
				{ key: 'info', value: 'No operations found in file' }
			],
			incomingEdges: []
		})
	}

	return {
		id: filename,
		nodes: nodes
	}
}

/**
 * Create a minimal test graph for debugging
 * @param filename The filename to use as the graph ID
 * @returns A minimal graph with 3 connected nodes
 */
export function createTestGraph(filename: string): ModelExplorerGraph {
	return {
		id: filename,
		nodes: [
			{
				id: 'node_0',
				label: 'Start',
				namespace: '',
				attrs: [],
				incomingEdges: []
			},
			{
				id: 'node_1',
				label: 'Middle',
				namespace: '',
				attrs: [],
				incomingEdges: [
					{
						sourceNodeId: 'node_0'
					}
				]
			},
			{
				id: 'node_2',
				label: 'End',
				namespace: '',
				attrs: [],
				incomingEdges: [
					{
						sourceNodeId: 'node_1'
					}
				]
			}
		]
	}
}