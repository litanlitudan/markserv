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

		// Skip closing braces
		if (trimmedLine === '}' || trimmedLine.startsWith('} loc(')) {
			if (trimmedLine.includes('func') || inFunctionBody) {
				inFunctionBody = false
			}
			return
		}

		let label = ''
		let namespace = 'default'
		let ssaValue: string | null = null
		const currentNodeId = `node_${nodeId}`
		const incomingEdges: GraphNode['incomingEdges'] = []
		let shouldAddNode = false

		// Handle module declaration
		if (trimmedLine.startsWith('module')) {
			// Only create a node for module if it's the standalone module declaration
			if (!trimmedLine.includes('attributes')) {
				label = 'module'
				namespace = 'module'
				shouldAddNode = true
			}
		}
		// Handle function definitions
		else if (trimmedLine.includes('func.func') || trimmedLine.includes('func @')) {
			const funcMatch = trimmedLine.match(/@([\w.]+)/)
			label = funcMatch ? funcMatch[1] : 'function'
			namespace = 'function'
			inFunctionBody = true
			shouldAddNode = true

			// Extract and register function arguments
			// Match patterns like: %arg0: tensor<f32>
			const argMatches = [...trimmedLine.matchAll(/(%arg\d+)(?:\s*:\s*[^,)]+)?/g)]
			for (const match of argMatches) {
				const argName = match[1]
				// Map function arguments to the function node itself for now
				// This creates the connection from function inputs
				ssaToNodeId.set(argName, currentNodeId)
			}
		}
		// Handle SSA value definitions with various dialects
		else if (inFunctionBody && trimmedLine.includes('=')) {
			// Match patterns like: %0 = stablehlo.cosine %arg0 : tensor<f32>
			// or: %result = "dialect.op"(%arg0, %arg1) : (type1, type2) -> type3
			const ssaMatch = trimmedLine.match(/^(%[\w.#]+)\s*=\s*(?:"?([^"\s(]+)"?\s*\(|([^\s(]+)\s+)(.*)/)
			if (ssaMatch) {
				ssaValue = ssaMatch[1]
				// Extract operation name from either quoted or unquoted format
				const quotedOp = ssaMatch[2]
				const unquotedOp = ssaMatch[3]
				const operation = quotedOp || unquotedOp || 'unknown_op'
				label = operation

				// Determine namespace from operation dialect
				const dialectMatch = operation.match(/^([\w]+)\./)
				namespace = dialectMatch ? dialectMatch[1] : 'op'

				// Extract the operands part
				const operandsPart = ssaMatch[4]

				// Find all SSA values in the operands
				// This regex matches %arg0, %0, %1, etc., but stops at : or )
				const ssaOperands = [...operandsPart.matchAll(/%[\w.#]+(?=[\s,):}]|$)/g)]
				for (const match of ssaOperands) {
					const operandName = match[0]
					const sourceNodeId = ssaToNodeId.get(operandName)
					if (sourceNodeId) {
						incomingEdges.push({
							sourceNodeId: sourceNodeId
						})
					}
				}

				shouldAddNode = true
			}
		}
		// Handle return statements
		else if (inFunctionBody && trimmedLine.startsWith('return')) {
			label = 'return'
			namespace = 'control'
			shouldAddNode = true

			// Extract returned SSA values
			const returnedValues = [...trimmedLine.matchAll(/%[\w.#]+/g)]
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
		// Handle yield statements (for regions/blocks)
		else if (inFunctionBody && trimmedLine.includes('yield')) {
			label = 'yield'
			namespace = 'control'
			shouldAddNode = true

			// Extract yielded SSA values
			const yieldedValues = [...trimmedLine.matchAll(/%[\w.#]+/g)]
			for (const match of yieldedValues) {
				const yieldValue = match[0]
				const sourceNodeId = ssaToNodeId.get(yieldValue)
				if (sourceNodeId) {
					incomingEdges.push({
						sourceNodeId: sourceNodeId
					})
				}
			}
		}

		// Only add the node if we determined it should be added
		if (shouldAddNode) {
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
		}
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