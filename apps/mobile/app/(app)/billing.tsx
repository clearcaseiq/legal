import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  getApiErrorMessage,
  getFilteredAttorneyLeads,
  getLeadInvoices,
  getLeadPayments,
  type BillingInvoice,
  type BillingPayment,
} from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { DomainBreadcrumb } from '../../src/components/DomainBreadcrumb'
import { leadLabel, leadMeta } from '../../src/lib/formatLead'
import { colors, radii, space, shadows } from '../../src/theme/tokens'

function formatCurrency(amount?: number | null) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(amount || 0))
}

type BillingRow =
  | ({ rowType: 'invoice' } & BillingInvoice)
  | ({ rowType: 'payment' } & BillingPayment)

export default function BillingScreen() {
  // Invoices and payments hang off a case, so this screen needs one. Reached
  // from the home hub there is no case yet, and it used to dead-end on "Missing
  // case" with nothing to tap; now it asks which case first.
  const { leadId, caseLabel } = useLocalSearchParams<{ leadId?: string; caseLabel?: string }>()
  const scopedLeadId = typeof leadId === 'string' && leadId ? leadId : null
  const scopedCaseLabel = typeof caseLabel === 'string' && caseLabel ? caseLabel : null

  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [payments, setPayments] = useState<BillingPayment[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      if (!scopedLeadId) {
        const response = await getFilteredAttorneyLeads({ sortBy: 'newest' })
        const rows = Array.isArray(response?.leads) ? response.leads : Array.isArray(response) ? response : []
        // Billing only makes sense on a case the firm actually took, and a
        // declined or closed case would just be noise in the picker.
        setLeads(
          rows.filter(
            (row: any) => !['rejected', 'declined', 'closed'].includes(String(row?.status || '').toLowerCase())
          )
        )
        return
      }
      const [invoiceData, paymentData] = await Promise.all([
        getLeadInvoices(scopedLeadId),
        getLeadPayments(scopedLeadId),
      ])
      setInvoices(Array.isArray(invoiceData) ? invoiceData : [])
      setPayments(Array.isArray(paymentData) ? paymentData : [])
    } catch (err: unknown) {
      setInvoices([])
      setPayments([])
      setLeads([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [scopedLeadId])

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

  if (loading) {
    return (
      <ScreenState
        title="Loading billing"
        message={scopedLeadId ? 'Fetching invoices, payments, and outstanding balance.' : 'Finding your open cases.'}
        loading
      />
    )
  }

  if (!scopedLeadId) {
    return (
      <View style={styles.screen}>
        {loadError ? (
          <View style={styles.bannerWrap}>
            <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); void load() }} />
          </View>
        ) : null}

        <DomainBreadcrumb domain="casework" title="Billing" style={styles.header} />
        <Text style={styles.pickerHint}>Choose a case to see its invoices, payments and outstanding balance.</Text>

        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={leads.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.leadRow}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Billing for ${leadLabel(item)}`}
              onPress={() => {
                setLoading(true)
                router.setParams({ leadId: item.id, caseLabel: leadLabel(item) })
              }}
            >
              <View style={styles.leadCopy}>
                <Text style={styles.leadTitle}>{leadLabel(item)}</Text>
                <Text style={styles.leadMeta}>{leadMeta(item)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>No open cases</Text>
              <Text style={styles.emptySub}>Accept a case and its invoices and payments will show up here.</Text>
            </View>
          }
        />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {loadError ? (
        <View style={styles.bannerWrap}>
          <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); void load() }} />
        </View>
      ) : null}

      <DomainBreadcrumb
        domain="casework"
        title={scopedCaseLabel ? `${scopedCaseLabel} · Billing` : 'Billing'}
        style={styles.header}
      />
      <TouchableOpacity
        style={styles.scopeBanner}
        onPress={() => {
          setLoading(true)
          router.setParams({ leadId: '', caseLabel: '' })
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Choose a different case"
      >
        <Ionicons name="swap-horizontal" size={16} color={colors.primaryDark} />
        <Text style={styles.scopeBannerText}>This case only</Text>
        <Text style={styles.scopeBannerAction}>Change case</Text>
      </TouchableOpacity>

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
  header: { paddingHorizontal: space.lg, paddingTop: space.lg },
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
  pickerHint: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  scopeBanner: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  scopeBannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  scopeBannerAction: { fontSize: 13, fontWeight: '800', color: colors.primary },
  leadRow: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    ...shadows.soft,
  },
  leadCopy: { flex: 1 },
  leadTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  leadMeta: { marginTop: 4, fontSize: 13, color: colors.textSecondary },
})
