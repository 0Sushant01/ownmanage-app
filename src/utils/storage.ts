import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * Universal key-value storage adapter.
 * Uses SecureStore on iOS and Android, and falls back safely to localStorage on Web.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key)
        }
      } catch (e) {
        console.warn('Failed to read from localStorage:', e)
      }
      return null
    }

    try {
      return await SecureStore.getItemAsync(key)
    } catch (e) {
      console.warn(`Failed to read ${key} from SecureStore:`, e)
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value)
        }
      } catch (e) {
        console.warn('Failed to write to localStorage:', e)
      }
      return
    }

    try {
      await SecureStore.setItemAsync(key, value)
    } catch (e) {
      console.warn(`Failed to write ${key} to SecureStore:`, e)
    }
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key)
        }
      } catch (e) {
        console.warn('Failed to remove from localStorage:', e)
      }
      return
    }

    try {
      await SecureStore.deleteItemAsync(key)
    } catch (e) {
      console.warn(`Failed to delete ${key} from SecureStore:`, e)
    }
  },
}

export default storage
