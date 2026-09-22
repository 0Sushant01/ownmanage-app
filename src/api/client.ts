import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'

/**
 * Centralized Axios API client instance for OwnManage Mobile App.
 * Uses authoritative Django backend API at /api/v1/
 */
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request interceptor: Attach JWT Bearer Token and active business header from SecureStore
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync('ownmanage_access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      const bizId = await SecureStore.getItemAsync('ownmanage_business_id')
      if (bizId) {
        config.headers['X-Business-ID'] = bizId
      }
    } catch {
      // SecureStore may fail in SSR / test environments
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default apiClient
