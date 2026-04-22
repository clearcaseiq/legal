import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  getApiErrorMessage,
  getLeadInvoices,
  getLeadPayments,
  type BillingInvoice,
  type BillingPayment,
} from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../src/theme/tokens'

function formatCurrency(amount?: number | null) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(amount || 0))
}

type BillingRow =
  | ({ rowType: 'invoice' } & BillingInvoice)
  | ({ rowType: 'payment' } & BillingPayment)

export default function BillingScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>()
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [payments, setPayments] = useState<BillingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!leadId) return
    try {
      setLoadError(null)
      const [invoiceData, paymentData] = await Promise.all([getLeadInvoices(leadId), getLeadPayments(leadId)])
      setInvoices(Array.isArray(invoiceData) ? invoiceData : [])
      setPayments(Array.isArray(paymentData) ? paymentData : [])
    } catch (err: unknown) {
      setInvoices([])
      setPayments([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [leadId])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  const totals = useMemo(() => {
    const invoiceTotal = invoices.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const paymentsTotal = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    return {
      invoiceTotal,
      paymentsTotal,
      outstanding: Math.max(0, invoiceTotal - paymentsTotal),
    }
  }, [invoices, payments])

  const rows = useMemo<BillingRow[]>(() => {
    const merged: BillingRow[] = [
      ...invoices.map((row) => ({ ...row, rowType: 'invoice' as const })),
      ...payments.map((row) => ({ ...row, rowType: 'payment' as const })),
    ]
    return merged.sort((a, b) => {
      const aDate = new Date(a.rowType === 'invoice' ? a.createdAt : a.receivedAt).getTime()
      const bDate = new Date(b.rowType === 'invoice' ? b.createdAt : b.receivedAt).getTime()
      return bDate - aDate
    })
  }, [invoices, payments])

  if (!leadId) {
    return <ScreenState title="Missing case" message="Open billing from a case to view invoices and payments." icon="card-outline" />
  }

  if (loading) {
    return <ScreenState title="Loading billing" message="Fetching invoices, payments, and outstanding balance." loading />
  }

  return (
    <View style={styles.screen}>
      {loadError ? (
        <View style={styles.bannerWrap}>
          <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); void load() }} />
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        <SummaryTile label="Invoiced" value={formatCurrency(totals.invoiceTotal)} icon="receipt-outline" />
        <SummaryTile label="Paid" value={formatCurrency(totals.paymentsTotal)} icon="cash-outline" tint={colors.success} />
      </View>
      <View style={[styles.summaryRow, { marginTop: 0 }]}>
        <SummaryTile label="Outstanding" value={formatCurrency(totals.outstanding)} icon="wallet-outline" tint={colors.warning} />
        <SummaryTile label="Entries" value={String(rows.length)} icon="list-outline" />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => `${item.rowType}-${item.id}`}
        contentContainerStyle={rows.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />
        }
        renderItem={({ item }) => {
          const isInvoice = item.rowType === 'invoice'
          const primaryDate = isInvoice ? item.dueDate || item.createdAt : item.receivedAt
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.badge, isInvoice ? styles.badgeInvoice : styles.badgePayment]}>
                  <Text style={styles.badgeText}>{isInvoice ? 'Invoice' : 'Payment'}</Text>
                </View>
                <Text style={[styles.amount, !isInvoice && { color: colors.success }]}>{formatCurrency(item.amount)}</Text>
              </View>
              {isInvoice ? (
                <Text style={styles.title}>{item.invoiceNumber ? `#${item.invoiceNumber}` : item.status || 'Invoice'}</Text>
              ) : (
                <Text style={styles.title}>{item.method ? `${item.method} payment` : 'Payment received'}</Text>
              )}
              <Text style={styles.meta}>
                {new Date(primaryDate || item.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {isInvoice ? ` · ${item.status}` : item.reference ? ` · Ref ${item.reference}` : ''}
              </Text>
              {item.notes ? <Text style={styles.note}>{item.notes}</Text> : null}
            </View>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No billing activity yet</Text>
            <Text style={styles.emptySub}>Invoices and payments recorded on this case will appear here.</Text>
          </View>
        }
      />
    </View>
  )
}

function SummaryTile({
  label,
  value,
  icon,
  tint = colors.primary,
}: {
  label: string
  value: string
  icon: keyof typeof Ionicons.glyphMap
  tint?: string
}) {
  return (
    <View style={styles.summaryTile}>
      <Ionicons name={icon} size={18} color={tint} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  bannerWrap: { paddingHorizontal: space.lg, paddingTop: space.md },
  summaryRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, marginTop: space.lg, marginBottom: space.md },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: space.sm },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 2 },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  emptyContainer: { flexGrow: 1, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm, gap: space.sm },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm },
  badgeInvoice: { backgroundColor: colors.primary + '14' },
  badgePayment: { backgroundColor: colors.successMuted },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.text },
  amount: { fontSize: 18, fontWeight: '800', color: colors.text },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  note: { fontSize: 14, color: colors.textSecondary, marginTop: space.md, lineHeight: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 21 },
})
