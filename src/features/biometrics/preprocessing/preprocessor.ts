/**
 * Production Preprocessing Contract Implementation
 * RGB layout, resize to 112x112, (x - 127.5) / 128.0 pixel scaling, CHW float32 tensor.
 */
import { INPUT_WIDTH, INPUT_HEIGHT } from '../model/modelContract'

export class FacePreprocessor {
  /**
   * Preprocesses raw RGB image data according to ArcFace MobileFaceNet contract.
   */
  static preprocessImage(rgbPixels: Uint8Array, width: number, height: number): Float32Array {
    const targetSize = INPUT_WIDTH * INPUT_HEIGHT
    const chwOutput = new Float32Array(3 * targetSize)

    // Bilinear scale factors
    const xRatio = width / INPUT_WIDTH
    const yRatio = height / INPUT_HEIGHT

    for (let dy = 0; dy < INPUT_HEIGHT; dy++) {
      const sy = Math.min(height - 1, Math.floor(dy * yRatio))
      for (let dx = 0; dx < INPUT_WIDTH; dx++) {
        const sx = Math.min(width - 1, Math.floor(dx * xRatio))
        const srcIdx = (sy * width + sx) * 3
        const dstIdx = dy * INPUT_WIDTH + dx

        // Preprocess: (val - 127.5) / 128.0
        const r = (rgbPixels[srcIdx] - 127.5) / 128.0
        const g = (rgbPixels[srcIdx + 1] - 127.5) / 128.0
        const b = (rgbPixels[srcIdx + 2] - 127.5) / 128.0

        // CHW layout
        chwOutput[dstIdx] = r
        chwOutput[targetSize + dstIdx] = g
        chwOutput[2 * targetSize + dstIdx] = b
      }
    }
    return chwOutput
  }
}
