import React, { createContext, useContext, useState, useEffect } from 'react'
import storage from '../utils/storage'
import apiClient from '../api/client'
import type { User, UserRole, BusinessSummary, EmployeeSummary } from '../types'

interface AuthContextType {
  user: User | null
  role: UserRole | null
  business: BusinessSummary | null
  employee: EmployeeSummary | null
  loading: boolean
  login: (email: string, password: string) => Promise<UserRole>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [business, setBusiness] = useState<BusinessSummary | null>(null)
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const loadCurrentUser = async () => {
    try {
      const token = await storage.getItem('ownmanage_access_token')
      if (!token) {
        setLoading(false)
        return
      }

      const res = await apiClient.get('/auth/me/')
      setUser(res.data.user)
      setRole(res.data.role)
      setBusiness(res.data.business)
      setEmployee(res.data.employee)
      if (res.data.business?.id) {
        await storage.setItem('ownmanage_business_id', res.data.business.id)
      }
    } catch {
      await storage.deleteItem('ownmanage_access_token')
      await storage.deleteItem('ownmanage_refresh_token')
      await storage.deleteItem('ownmanage_business_id')
      setUser(null)
      setRole(null)
      setBusiness(null)
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCurrentUser()
  }, [])

  const login = async (email: string, password: string): Promise<UserRole> => {
    const res = await apiClient.post('/auth/login/', { email, password })
    const { tokens, user, role, business, employee } = res.data

    await storage.setItem('ownmanage_access_token', tokens.access)
    await storage.setItem('ownmanage_refresh_token', tokens.refresh)
    if (business?.id) {
      await storage.setItem('ownmanage_business_id', business.id)
    }

    setUser(user)
    setRole(role)
    setBusiness(business)
    setEmployee(employee)

    return role
  }

  const logout = async () => {
    try {
      const refresh = await storage.getItem('ownmanage_refresh_token')
      if (refresh) {
        await apiClient.post('/auth/logout/', { refresh })
      }
    } catch {
      // Ignore network error on logout
    } finally {
      await storage.deleteItem('ownmanage_access_token')
      await storage.deleteItem('ownmanage_refresh_token')
      await storage.deleteItem('ownmanage_business_id')
      setUser(null)
      setRole(null)
      setBusiness(null)
      setEmployee(null)
    }
  }

  const refreshUser = async () => {
    await loadCurrentUser()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        business,
        employee,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
