import { Stack, router } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, space } from '../../src/theme/tokens'
import { PushNavigationHandler } from '../../src/components/PushNavigationHandler'
import { AttorneyDashboardProvider } from '../../src/contexts/AttorneyDashboardContext'

function DashboardHeaderButton() {
  return (
    <TouchableOpacity
      onPress={() => router.replace('/(app)/(tabs)')}
      accessibilityRole="button"
      accessibilityLabel="Back to dashboard"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ paddingHorizontal: space.sm, flexDirection: 'row', alignItems: 'center', gap: 4 }}
    >
      <Ionicons name="home-outline" size={22} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Dashboard</Text>
    </TouchableOpacity>
  )
}

export default function AppLayout() {
  return (
    <AttorneyDashboardProvider>
      <View style={{ flex: 1 }}>
        <PushNavigationHandler />
        <Stack
          screenOptions={{
            headerShown: false,
            headerLeft: () => <DashboardHeaderButton />,
            contentStyle: { backgroundColor: colors.surface },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="lead/[id]"
            options={{
              headerShown: true,
              title: 'Case review',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="chat/[roomId]"
            options={{
              headerShown: true,
              title: 'Conversation',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="tasks"
            options={{
              headerShown: true,
              title: 'Tasks',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="contacts"
            options={{
              headerShown: true,
              title: 'Contacts',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="search"
            options={{
              headerShown: true,
              title: 'Search',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="new-matches"
            options={{
              headerShown: true,
              title: 'New Matches',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="match-quality"
            options={{
              headerShown: true,
              title: 'Match Quality',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="marketplace"
            options={{
              headerShown: true,
              title: 'Marketplace Performance',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="notifications"
            options={{
              headerShown: true,
              title: 'Alerts',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="notes"
            options={{
              headerShown: true,
              title: 'Notes',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="billing"
            options={{
              headerShown: true,
              title: 'Billing',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="files"
            options={{
              headerShown: true,
              title: 'Files',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="document-requests"
            options={{
              headerShown: true,
              title: 'Document requests',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="manual-case"
            options={{
              headerShown: true,
              title: 'Add manual case',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="schedule-consult"
            options={{
              headerShown: true,
              title: 'Create calendar event',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="request-docs"
            options={{
              headerShown: true,
              title: 'Request documents',
              headerStyle: { backgroundColor: colors.nav },
              headerTintColor: '#fff',
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
      </View>
    </AttorneyDashboardProvider>
  )
}
