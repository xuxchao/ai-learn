/**
 * AI 相关的数学工具函数
 */

export interface Vector {
  x: number;
  y: number;
  z: number;
}

/**
 * 计算两个向量的点积
 */
export function dotProduct(a: Vector, b: Vector): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * 计算向量的模长
 */
export function magnitude(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * 计算两个向量的夹角余弦值
 */
export function cosineSimilarity(a: Vector, b: Vector): number {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  
  if (magA === 0 || magB === 0) {
    return 0;
  }
  
  return dot / (magA * magB);
}
