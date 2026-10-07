/**
 * OWNManage Production Face Biometric Contract Specification
 * Synchronized with backend ModelRegistry.
 */
export const FACE_MODEL_ID = 'OWNMANAGE-MOBILEFACENET-ARCFACE-128-V1' as const
export const FACE_MODEL_VERSION = '1.0.0' as const
export const EMBEDDING_DIMENSION = 128 as const
export const INPUT_WIDTH = 112 as const
export const INPUT_HEIGHT = 112 as const
export const COLOR_FORMAT = 'RGB' as const
export const NORMALIZATION = 'L2' as const
export const DISTANCE_METRIC = 'COSINE' as const
export const MODEL_FORMAT = 'ONNX' as const
export const PREPROCESSING_VERSION = '1.0.0' as const

export const MODEL_SHA256 =
  'f4a2bdfc9a97e8f186a3ba747337424ffa4211ec56b25449bfa96de1a276a241' as const

export const MATCH_POLICY = {
  similarity_metric: 'COSINE',
  accept_threshold: 0.68,
  review_threshold: 0.58,
  reject_threshold: 0.50,
} as const

export interface BiometricModelManifest {
  model_id: string
  model_version: string
  embedding_dimension: number
  input_width: number
  input_height: number
  color_format: string
  normalization: string
  distance_metric: string
  model_format: string
  preprocessing_version: string
  threshold_policy: {
    similarity_metric: string
    accept_threshold: number
    review_threshold: number
    reject_threshold: number
  }
}
