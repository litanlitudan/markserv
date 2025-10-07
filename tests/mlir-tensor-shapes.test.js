import {describe, it, expect} from 'vitest';
import {convertMLIRToGraph} from '../dist/mlir-to-graph.js';

describe('MLIR Tensor Shape Extraction', () => {
	it('extracts tensor shapes from MLIR operations', () => {
	const mlirContent = `
module {
  func.func @test_shapes(%arg0: tensor<2x3xf32>, %arg1: tensor<3x4xf32>) -> (tensor<2x4xf32>) {
    %0 = stablehlo.dot %arg0, %arg1 : (tensor<2x3xf32>, tensor<3x4xf32>) -> tensor<2x4xf32>
    %1 = stablehlo.add %0, %0 : tensor<2x4xf32>
    return %1 : tensor<2x4xf32>
  }
}
`;

	const graph = convertMLIRToGraph(mlirContent, 'test.mlir');

		// Check that we have the expected nodes
		expect(graph.nodes.length).toBe(5);

		// Find the function node
		const funcNode = graph.nodes.find(n => n.namespace === 'function');
		expect(funcNode).toBeDefined();
		expect(funcNode.label).toBe('test_shapes');

		// Find the stablehlo.dot operation node
		const dotNode = graph.nodes.find(n => n.label.includes('stablehlo.dot'));
		expect(dotNode).toBeDefined();
		// Label should include type information for better visualization
		expect(dotNode.label).toContain('stablehlo.dot');
		expect(dotNode.label).toContain('in: tensor<2x3xf32>, tensor<3x4xf32>');
		expect(dotNode.label).toContain('out: tensor<2x4xf32>');
		// Check output metadata
		expect(dotNode.outputsMetadata).toBeDefined();
		expect(dotNode.outputsMetadata.length).toBe(1);
		expect(dotNode.outputsMetadata[0].id).toBe('0');
		expect(dotNode.outputsMetadata[0].attrs).toEqual([{key: 'tensor_shape', value: '2x4xf32'}]);
		// Check input metadata
		expect(dotNode.inputsMetadata).toBeDefined();
		expect(dotNode.inputsMetadata.length).toBe(2);
		expect(dotNode.inputsMetadata[0].attrs).toEqual([{key: 'tensor_shape', value: '2x3xf32'}]);
		expect(dotNode.inputsMetadata[1].attrs).toEqual([{key: 'tensor_shape', value: '3x4xf32'}]);

		// Find the stablehlo.add operation node
		const addNode = graph.nodes.find(n => n.label.includes('stablehlo.add'));
		expect(addNode).toBeDefined();
		// Label should include type information
		expect(addNode.label).toContain('stablehlo.add');
		expect(addNode.label).toContain('out: tensor<2x4xf32>');
		// Check output metadata
		expect(addNode.outputsMetadata).toBeDefined();
		expect(addNode.outputsMetadata.length).toBe(1);
		expect(addNode.outputsMetadata[0].id).toBe('0');
		expect(addNode.outputsMetadata[0].attrs).toEqual([{key: 'tensor_shape', value: '2x4xf32'}]);
		// Check input metadata
		expect(addNode.inputsMetadata).toBeDefined();
		expect(addNode.inputsMetadata.length).toBe(1);
		expect(addNode.inputsMetadata[0].attrs).toEqual([{key: 'tensor_shape', value: '2x4xf32'}]);
	});

	it('handles scalar tensors', () => {
	const mlirContent = `
module {
  func.func @test_scalar(%arg0: tensor<f32>) -> (tensor<f32>) {
    %0 = stablehlo.cosine %arg0 : tensor<f32>
    return %0 : tensor<f32>
  }
}
`;

		const graph = convertMLIRToGraph(mlirContent, 'test.mlir');

		// Find the function node
		const funcNode = graph.nodes.find(n => n.namespace === 'function');
		expect(funcNode).toBeDefined();
		expect(funcNode.label).toBe('test_scalar');

		// Find the cosine operation node
		const cosNode = graph.nodes.find(n => n.label.includes('stablehlo.cosine'));
		expect(cosNode).toBeDefined();
		// Label should include type information
		expect(cosNode.label).toContain('stablehlo.cosine');
		expect(cosNode.label).toContain('out: tensor<f32>');
		// Check output metadata
		expect(cosNode.outputsMetadata).toBeDefined();
		expect(cosNode.outputsMetadata.length).toBe(1);
		expect(cosNode.outputsMetadata[0].id).toBe('0');
		expect(cosNode.outputsMetadata[0].attrs).toEqual([{key: 'tensor_shape', value: 'f32'}]);
		// Check input metadata
		expect(cosNode.inputsMetadata).toBeDefined();
		expect(cosNode.inputsMetadata.length).toBe(1);
		expect(cosNode.inputsMetadata[0].attrs).toEqual([{key: 'tensor_shape', value: 'f32'}]);
	});

	it('handles operations without explicit return type', () => {
	const mlirContent = `
module {
  func.func @test_implicit(%arg0: tensor<2x3xf32>) -> (tensor<2x3xf32>) {
    %0 = stablehlo.negate %arg0 : tensor<2x3xf32>
    return %0 : tensor<2x3xf32>
  }
}
`;

		const graph = convertMLIRToGraph(mlirContent, 'test.mlir');

		const negateNode = graph.nodes.find(n => n.label.includes('stablehlo.negate'));
		expect(negateNode).toBeDefined();
		// Label should include type information
		expect(negateNode.label).toContain('stablehlo.negate');
		expect(negateNode.label).toContain('out: tensor<2x3xf32>');
		// Check output metadata
		expect(negateNode.outputsMetadata).toBeDefined();
		expect(negateNode.outputsMetadata.length).toBe(1);
		expect(negateNode.outputsMetadata[0].id).toBe('0');
		expect(negateNode.outputsMetadata[0].attrs).toEqual([{key: 'tensor_shape', value: '2x3xf32'}]);
		// Check input metadata
		expect(negateNode.inputsMetadata).toBeDefined();
		expect(negateNode.inputsMetadata.length).toBe(1);
		expect(negateNode.inputsMetadata[0].attrs).toEqual([{key: 'tensor_shape', value: '2x3xf32'}]);
	});
});
