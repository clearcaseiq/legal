import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '../src/contexts/AuthContext'
import { NotificationProvider } from '../src/contexts/NotificationContext'
import { colors } from '../src/theme/tokens'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '700' },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="light" />
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
