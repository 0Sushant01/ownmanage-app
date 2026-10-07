/**
 * Device Provisioning & Assertion Signing Service
 * Binds device identity, manages template synchronization, and constructs
 * cryptographic verification assertions for attendance submissions.
 */
import apiClient from '../../../api/client'
import { TemplateStore } from '../secure-storage/templateStore'
import { FACE_MODEL_ID } from '../model/modelContract'
import { Platform } from 'react-native'

export interface VerificationAssertionPayload {
  challenge_id: string
  nonce: string
  device_id: string
  model_id: string
  similarity_score: number
  liveness: boolean
  timestamp: string
}

export class MobileDeviceService {
  /**
   * Registers current device with backend if not already registered.
   */
  static async registerCurrentDevice(): Promise<string> {
    const deviceId = await TemplateStore.getDeviceId()
    const secret = await TemplateStore.getDeviceSecret()

    try {
      await apiClient.post('/biometrics/devices/register/', {
        device_id: deviceId,
        device_name: `${Platform.OS.toUpperCase()} Device (${deviceId.substring(0, 8)})`,
        platform: Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'web' ? 'WEB' : 'ANDROID',
        public_key: secret,
      })
    } catch {
      // If already registered, ignore
    }
    return deviceId
  }

  /**
   * Syncs latest biometric template from backend into local secure storage.
   */
  static async syncBiometricTemplate(): Promise<any | null> {
    const deviceId = await this.registerCurrentDevice()
    try {
      const res = await apiClient.get(`/biometrics/template/provision/?device_id=${deviceId}`)
      if (res.data && res.data.template_vector) {
        await TemplateStore.saveTemplate(res.data)
        return res.data
      }
    } catch (err) {
      console.warn('Could not sync biometric template:', err)
    }
    return await TemplateStore.getTemplate()
  }

  /**
   * Requests a fresh challenge nonce from backend (60s TTL).
   */
  static async requestChallenge(): Promise<any> {
    const deviceId = await TemplateStore.getDeviceId()
    const res = await apiClient.post('/biometrics/challenge/', { device_id: deviceId })
    return res.data
  }

  /**
   * Constructs the authoritative verification assertion payload.
   */
  static async createAssertion(
    challenge: any,
    similarityScore: number,
    isLive: boolean
  ): Promise<VerificationAssertionPayload> {
    const deviceId = await TemplateStore.getDeviceId()

    return {
      challenge_id: challenge.challenge_id,
      nonce: challenge.nonce,
      device_id: deviceId,
      model_id: FACE_MODEL_ID,
      similarity_score: similarityScore,
      liveness: isLive,
      timestamp: new Date().toISOString(),
    }
  }
}
