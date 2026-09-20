import axios, { type AxiosInstance } from 'axios'
import * as SecureStore from 'expo-secure-store'

/**
 * Centralized Axios API client instance for OwnManage Mobile App.
 * Base URL is dynamically read from Expo public environment variables.
 */
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || ''

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request interceptor placeholder for future auth token attachment from SecureStore
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Future authentication token retrieval:
      // const token = await SecureStore.getItemAsync('auth_token')
      // if (token) {
      //   config.headers.Authorization = `Bearer ${token}`
      // }
    } catch {
      // Graceful fallback if storage read fails
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor placeholder for future error handling
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default apiClient
