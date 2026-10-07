/**
 * Secure Biometric Template Storage
 * Stores authorized employee 128-D template in hardware-backed SecureStore.
 */
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const TEMPLATE_KEY = 'ownmanage_biometric_template_v1'
const DEVICE_KEY = 'ownmanage_device_id_v1'
const DEVICE_SECRET_KEY = 'ownmanage_device_secret_v1'

// Web memory fallback
let memoryStorage: Record<string, string> = {}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value)
    } catch {
      memoryStorage[key] = value
    }
  } else {
    await SecureStore.setItemAsync(key, value)
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key) || memoryStorage[key] || null
    } catch {
      return memoryStorage[key] || null
    }
  } else {
    return await SecureStore.getItemAsync(key)
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key)
    } catch {}
    delete memoryStorage[key]
  } else {
    await SecureStore.deleteItemAsync(key)
  }
}

export class TemplateStore {
  static async saveTemplate(templatePayload: any): Promise<void> {
    await setItem(TEMPLATE_KEY, JSON.stringify(templatePayload))
  }

  static async getTemplate(): Promise<any | null> {
    const raw = await getItem(TEMPLATE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  static async clearTemplate(): Promise<void> {
    await deleteItem(TEMPLATE_KEY)
  }

  static async getDeviceId(): Promise<string> {
    let id = await getItem(DEVICE_KEY)
    if (!id) {
      id = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase()
      await setItem(DEVICE_KEY, id)
    }
    return id
  }

  static async getDeviceSecret(): Promise<string> {
    let sec = await getItem(DEVICE_SECRET_KEY)
    if (!sec) {
      sec = 'SEC-' + Math.random().toString(36).substring(2, 15)
      await setItem(DEVICE_SECRET_KEY, sec)
    }
    return sec
  }
}
