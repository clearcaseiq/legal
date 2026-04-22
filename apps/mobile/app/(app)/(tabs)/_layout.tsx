import { useEffect } from 'react'
import { AppState } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, shadows } from '../../../src/theme/tokens'
import { useAttorneyDashboardData } from '../../../src/contexts/AttorneyDashboardContext'
import { useAuth } from '../../../src/contexts/AuthContext'

export default function TabsLayout() {
  const { user } = useAuth()
  const isAttorney = user?.role !== 'plaintiff'
  const { data, refresh } = useAttorneyDashboardData()
  const msgUnread = data?.messagingSummary?.unreadCount || 0

  useEffect(() => {
    if (!isAttorney) {
      return
    }
    let intervalId: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (intervalId) return
      intervalId = setInterval(() => {
        void refresh({ force: true, silent: true })
      }, 45_000)
    }

    const stopPolling = () => {
      if (!intervalId) return
      clearInterval(intervalId)
      intervalId = null
    }

    startPolling()

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refresh({ force: true, silent: true })
        startPolling()
        return
      }
      stopPolling()
    })

    return () => {
      stopPolling()
      subscription.remove()
    }
  }, [isAttorney, refresh])

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          paddingTop: 8,
          height: 64,
          ...shadows.soft,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
        headerStyle: { backgroundColor: colors.nav },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name={isAttorney ? 'grid-outline' : 'home-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: isAttorney ? 'Cases' : 'Updates',
          tabBarIcon: ({ color, size }) => <Ionicons name={isAttorney ? 'folder-open-outline' : 'time-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: isAttorney && msgUnread > 0 ? (msgUnread > 99 ? 99 : msgUnread) : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: isAttorney ? 'Calendar' : 'Documents',
          tabBarIcon: ({ color, size }) => <Ionicons name={isAttorney ? 'calendar-outline' : 'document-text-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
