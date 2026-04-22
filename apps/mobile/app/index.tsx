import { useEffect } from 'react'
import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '../src/contexts/AuthContext'
import { colors } from '../src/theme/tokens'
import { ScreenState } from '../src/components/ScreenState'
import { getApiTroubleshootingMessage } from '../src/lib/api'

export default function Index() {
  const { isAuthenticated, isLoading, startupError, retryAuthCheck } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.navDeep }}>
        <ActivityIndicator size="large" color={colors.brandAccent} />
      </View>
    )
  }

  if (startupError) {
    return (
      <ScreenState
        icon="cloud-offline-outline"
        title="Unable to restore your session"
        message={`${startupError} ${getApiTroubleshootingMessage()}`}
        actionLabel="Try again"
        onAction={() => {
          void retryAuthCheck()
        }}
      />
    )
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)" />
  }

  return <Redirect href="/(auth)/login" />
}
