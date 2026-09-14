import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { colors, space } from '../theme/tokens'

/**
 * Covers the app when it returns from the background after sitting idle.
 *
 * A modal rather than a route, so it lands over whatever the attorney was
 * looking at without disturbing navigation — the case they were reading is
 * still there when they come back, and nothing underneath is readable until
 * they prove who they are.
 *
 * Signing out is offered alongside, because the person holding the phone may
 * not be the one who can satisfy the prompt.
 */
export function SessionLockScreen() {
  const { isLocked, unlock, logout } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const prompting = useRef(false)

  const attempt = useCallback(async () => {
    // One prompt at a time: the OS queues duplicates and the attorney ends up
    // answering the same dialog twice.
    if (prompting.current) return
    prompting.current = true
    try {
      const ok = await unlock()
      setDismissed(!ok)
    } finally {
      prompting.current = false
    }
  }, [unlock])

  useEffect(() => {
    if (!isLocked) {
      setDismissed(false)
      return
    }
    void attempt()
  }, [isLocked, attempt])

  if (!isLocked) return null

  return (
    <Modal visible animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={44} color={colors.brandAccent} />
        <Text style={styles.title}>ClearCaseIQ is locked</Text>
        <Text style={styles.message}>
          {dismissed
            ? 'Unlock to get back to your cases. Your work is exactly where you left it.'
            : 'Confirm it is you to continue.'}
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => void attempt()} activeOpacity={0.88}>
          <Text style={styles.buttonText}>Unlock</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => void logout()} activeOpacity={0.7}>
          <Text style={styles.secondaryText}>Sign out instead</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: colors.navDeep,
  },
  title: {
    marginTop: space.md,
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  message: {
    marginTop: space.sm,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  button: {
    marginTop: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondary: {
    marginTop: space.md,
    padding: space.sm,
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
})
