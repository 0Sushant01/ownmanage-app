/**
 * Face Crop & Alignment Transformer
 * Normalizes detected face region with 15% safety margin into canonical 112x112 layout.
 */
import { INPUT_WIDTH, INPUT_HEIGHT } from '../model/modelContract'
import type { DetectedFaceBox } from '../detection/faceDetector'

export interface AlignedFaceCrop {
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
  targetWidth: number
  targetHeight: number
}

export class FaceAligner {
  /**
   * Computes aligned crop bounds with safety padding
   */
  static align(box: DetectedFaceBox, frameWidth: number, frameHeight: number): AlignedFaceCrop {
    const marginX = box.width * 0.15
    const marginY = box.height * 0.15

    const cropX = Math.max(0, box.x - marginX)
    const cropY = Math.max(0, box.y - marginY)
    const cropWidth = Math.min(frameWidth - cropX, box.width + 2 * marginX)
    const cropHeight = Math.min(frameHeight - cropY, box.height + 2 * marginY)

    return {
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      targetWidth: INPUT_WIDTH,
      targetHeight: INPUT_HEIGHT,
    }
  }
}
