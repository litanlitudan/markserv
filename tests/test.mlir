// Example MLIR code
func.func @add(%arg0: i32, %arg1: i32) -> i32 {
  %result = arith.addi %arg0, %arg1 : i32
  return %result : i32
}

module {
  func.func @main() {
    %c0 = arith.constant 0 : i32
    %c1 = arith.constant 1 : i32
    %sum = func.call @add(%c0, %c1) : (i32, i32) -> i32
    return
  }
}
