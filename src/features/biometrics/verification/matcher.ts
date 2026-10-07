/**
 * Biometric Cosine Similarity Matcher & Decision Policy
 * Cosine Similarity: sum(A_i * B_i) for L2-normalized unit vectors.
 */
import { MATCH_POLICY } from '../model/modelContract'

export interface MatchDecision {
  similarity: number
  decision: 'ACCEPT' | 'REVIEW' | 'REJECT'
  passed: boolean
  thresholdUsed: number
}

export class BiometricMatcher {
  /**
   * Computes cosine similarity between two 128-D L2-normalized vectors.
   * Since ||A|| == 1 and ||B|| == 1, cosine similarity is the dot product.
   */
  static cosineSimilarity(
    vecA: number[] | Float32Array,
    vecB: number[] | Float32Array
  ): number {
    if (vecA.length !== vecB.length) {
      throw new Error(`Dimension mismatch: vecA (${vecA.length}) vs vecB (${vecB.length})`)
    }

    let dot = 0
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i]
    }
    return Math.max(-1.0, Math.min(1.0, dot))
  }

  /**
   * Evaluates match decision against versioned policy threshold.
   */
  static evaluate(
    liveEmbedding: Float32Array,
    enrolledTemplate: number[] | Float32Array
  ): MatchDecision {
    const similarity = this.cosineSimilarity(liveEmbedding, enrolledTemplate)

    let decision: 'ACCEPT' | 'REVIEW' | 'REJECT' = 'REJECT'
    if (similarity >= MATCH_POLICY.accept_threshold) {
      decision = 'ACCEPT'
    } else if (similarity >= MATCH_POLICY.review_threshold) {
      decision = 'REVIEW'
    }

    return {
      similarity: Math.round(similarity * 10000) / 10000,
      decision,
      passed: decision === 'ACCEPT',
      thresholdUsed: MATCH_POLICY.accept_threshold,
    }
  }
}
