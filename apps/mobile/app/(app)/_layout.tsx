import { Stack } from 'expo-router'
import { View } from 'react-native'
import { colors } from '../../src/theme/tokens'
import { PushNavigationHandler } from '../../src/components/PushNavigationHandler'
import { AttorneyDashboardProvider } from '../../src/contexts/AttorneyDashboardContext'

export default function AppLayout() {
  return (
    <AttorneyDashboardProvider>
      <View style={{ flex: 1 }}>
        <PushNavigationHandler />
        <Stack
          screenOptions={{
            headerShown: false,
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
        </Stack>
      </View>
    </AttorneyDashboardProvider>
  )
}
