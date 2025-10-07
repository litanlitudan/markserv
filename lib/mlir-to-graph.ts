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

	lines.forEach((line, index) => {
		const trimmedLine = line.trim()

		// Skip empty lines and comments
		if (!trimmedLine || trimmedLine.startsWith('//')) return

		let label = trimmedLine
		let namespace = 'default'
		let ssaValue: string | null = null
		const currentNodeId = `node_${nodeId}`
		const incomingEdges: GraphNode['incomingEdges'] = []

		// Try to extract operation type and SSA value
		if (trimmedLine.includes('func.func') || trimmedLine.includes('func @')) {
			const funcMatch = trimmedLine.match(/@([\w.]+)/)
			label = funcMatch ? `${funcMatch[1]}` : 'function'
			namespace = 'function'
		} else if (trimmedLine.includes('=')) {
			// Extract SSA value and operation
			const ssaMatch = trimmedLine.match(/^(%[\w.]+)\s*=\s*([\w.]+)/)
			if (ssaMatch) {
				ssaValue = ssaMatch[1]
				label = ssaMatch[2]
				namespace = 'op'

				// Extract operands to create edges
				const operandsMatch = trimmedLine.match(/\((.*?)\)/)
				if (operandsMatch) {
					const operands = operandsMatch[1].split(',').map(o => o.trim())
					operands.forEach((operand) => {
						// Check if operand is an SSA value
						if (operand.startsWith('%')) {
							const operandName = operand.split(':')[0].trim() // Remove type info
							const sourceNodeId = ssaToNodeId.get(operandName)
							if (sourceNodeId) {
								incomingEdges.push({
									sourceNodeId: sourceNodeId
								})
							}
						}
					})
				}
			}
		} else if (trimmedLine.includes('module')) {
			label = 'module'
			namespace = 'module'
		} else if (trimmedLine.includes('return')) {
			label = 'return'
			namespace = 'control'
			// Create edge from returned value
			const returnMatch = trimmedLine.match(/return\s+(%[\w.]+)/)
			if (returnMatch) {
				const returnValue = returnMatch[1]
				const sourceNodeId = ssaToNodeId.get(returnValue)
				if (sourceNodeId) {
					incomingEdges.push({
						sourceNodeId: sourceNodeId
					})
				}
			}
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