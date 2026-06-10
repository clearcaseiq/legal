import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Text, TextInput } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '../src/contexts/AuthContext'
import { NotificationProvider } from '../src/contexts/NotificationContext'
import { ThemeProvider } from '../src/contexts/ThemeContext'
import { colors } from '../src/theme/tokens'

// Cap Dynamic Type scaling so large accessibility text sizes don't overflow the
// app's many fixed-height rows, while still honoring user font-size preferences.
const MAX_FONT_SCALE = 1.3
const TextWithDefaults = Text as unknown as { defaultProps?: { maxFontSizeMultiplier?: number; allowFontScaling?: boolean } }
const TextInputWithDefaults = TextInput as unknown as { defaultProps?: { maxFontSizeMultiplier?: number; allowFontScaling?: boolean } }
TextWithDefaults.defaultProps = { ...TextWithDefaults.defaultProps, allowFontScaling: true, maxFontSizeMultiplier: MAX_FONT_SCALE }
TextInputWithDefaults.defaultProps = { ...TextInputWithDefaults.defaultProps, allowFontScaling: true, maxFontSizeMultiplier: MAX_FONT_SCALE }

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.nav },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: colors.surface },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(app)" options={{ headerShown: false }} />
            </Stack>
            {/* Nav chrome is deep navy in both themes, so light status bar content is always correct. */}
            <StatusBar style="light" />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
