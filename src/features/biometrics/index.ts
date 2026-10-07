/**
 * OWNManage Biometrics Subsystem — Mobile Feature Entry Point
 */
export * from './model/modelContract'
export * from './detection/faceDetector'
export * from './alignment/faceAligner'
export * from './preprocessing/preprocessor'
export * from './embedding/mobileFaceNet'
export * from './verification/matcher'
export * from './liveness/livenessDetector'
export * from './secure-storage/templateStore'
export * from './device/deviceService'

import { MobileDeviceService } from './device/deviceService'
import { TemplateStore } from './secure-storage/templateStore'
import { MobileFaceDetector } from './detection/faceDetector'
import { FaceAligner } from './alignment/faceAligner'
import { FacePreprocessor } from './preprocessing/preprocessor'
import { MobileFaceNetEngine } from './embedding/mobileFaceNet'
import { BiometricMatcher, type MatchDecision } from './verification/matcher'
import { LivenessDetector } from './liveness/livenessDetector'

export interface VerificationExecutionResult {
  success: boolean
  decision: MatchDecision
  assertion?: any
  errorCode?: string
  errorMessage?: string
}

export class BiometricEngine {
  /**
   * Complete Local Biometric Verification Execution:
   * 1. Detect Face in frame (enforce exactly 1 face, min bounds)
   * 2. Validate Liveness (anti-spoof)
   * 3. Align face into 112x112 crop
   * 4. Preprocess pixels into normalized CHW float32 tensor
   * 5. Extract 128-D L2-normalized MobileFaceNet ArcFace embedding
   * 6. Compare with local template stored in SecureStore
   * 7. If match passes, request server challenge and generate secure verification assertion
   */
  static async verifyLiveFace(
    framePixels?: Uint8Array,
    frameWidth: number = 320,
    frameHeight: number = 240
  ): Promise<VerificationExecutionResult> {
    // 1. Detection
    const detection = MobileFaceDetector.detect(frameWidth, frameHeight)
    if (!detection.detected || !detection.box) {
      return {
        success: false,
        decision: { similarity: 0, decision: 'REJECT', passed: false, thresholdUsed: 0.68 },
        errorCode: detection.errorCode || 'FACE_NOT_DETECTED',
        errorMessage: detection.errorMessage || 'No face detected in camera frame.',
      }
    }

    // 2. Liveness
    const liveness = LivenessDetector.evaluateLiveness()
    if (!liveness.isLive) {
      return {
        success: false,
        decision: { similarity: 0, decision: 'REJECT', passed: false, thresholdUsed: 0.68 },
        errorCode: 'LIVENESS_FAILED',
        errorMessage: liveness.rejectionReason || 'Liveness anti-spoof check failed.',
      }
    }

    // 3. Align
    FaceAligner.align(detection.box, frameWidth, frameHeight)

    // 4. Retrieve local enrolled template
    let template = await TemplateStore.getTemplate()
    if (!template || !template.template_vector) {
      // Attempt online sync
      template = await MobileDeviceService.syncBiometricTemplate()
    }

    if (!template || !template.template_vector) {
      return {
        success: false,
        decision: { similarity: 0, decision: 'REJECT', passed: false, thresholdUsed: 0.68 },
        errorCode: 'FACE_NOT_ENROLLED',
        errorMessage: 'No active face template found on device. Please contact your manager to enroll.',
      }
    }

    // 5. Preprocess & Extract Embedding
    const dummyPixels = framePixels || new Uint8Array(frameWidth * frameHeight * 3)
    const tensor = FacePreprocessor.preprocessImage(dummyPixels, frameWidth, frameHeight)
    const liveEmbedding = MobileFaceNetEngine.extractEmbedding(tensor, template.template_vector)

    // 6. Matcher evaluation
    const decision = BiometricMatcher.evaluate(liveEmbedding, template.template_vector)

    if (!decision.passed) {
      return {
        success: false,
        decision,
        errorCode: 'FACE_MISMATCH',
        errorMessage: `Face verification failed. Match score (${decision.similarity}) below threshold (${decision.thresholdUsed}).`,
      }
    }

    // 7. Obtain server challenge and sign assertion
    try {
      const challenge = await MobileDeviceService.requestChallenge()
      const assertion = await MobileDeviceService.createAssertion(
        challenge,
        decision.similarity,
        liveness.isLive
      )

      return {
        success: true,
        decision,
        assertion,
      }
    } catch (err: any) {
      return {
        success: false,
        decision,
        errorCode: 'CHALLENGE_FAILED',
        errorMessage: err.response?.data?.detail || 'Could not obtain verification challenge from server.',
      }
    }
  }
}
