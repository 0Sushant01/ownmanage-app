import React from 'react'
import { Tabs } from 'expo-router'
import { Platform, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fonts, type } from '../../src/theme'
import { useAppTheme } from '../../src/context/ThemeContext'

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { colors } = useAppTheme()
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 10 : 8)

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bgElevated,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          ...type.bold,
          fontSize: 17,
          letterSpacing: -0.35,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 54 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: {
          fontSize: 11,
          letterSpacing: 0.2,
          fontFamily: fonts.semibold,
        },
        tabBarItemStyle: {
          minHeight: 44,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'OwnManage Attendance',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⏱️</Text>,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          headerTitle: 'Attendance Calendar',
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Meetings',
          headerTitle: 'Meetings & Schedule',
          tabBarLabel: 'Meetings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🤝</Text>,
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Leave',
          headerTitle: 'Leave Management',
          tabBarLabel: 'Leave',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏖️</Text>,
        }}
      />
      <Tabs.Screen
        name="salary"
        options={{
          href: null,
          title: 'Salary',
          headerTitle: 'My Salary & Payslips',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Employee Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text>,
        }}
      />
    </Tabs>
  )
}
