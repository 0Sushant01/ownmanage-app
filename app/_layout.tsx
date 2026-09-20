import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#090d16',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'OwnManage',
          }}
        />
      </Stack>
    </>
  )
}
