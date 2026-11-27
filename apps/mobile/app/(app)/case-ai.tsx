/**
 * Per-case AI, matching the web case workspace's "AI Copilot" and "Rose" tabs:
 * cited Q&A grounded in the case file, and Rose's case review with the next
 * tasks she raised.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  approveAllLeadTasks,
  askCaseCopilot,
  getApiErrorMessage,
  getCaseCoach,
  getLeadCommandCenter,
  getLeadTasks,
  type CaseCoach,
  type CaseTaskRow,
  type CopilotTurn,
} from '../../src/lib/api'
import { isAiTask } from '../../src/lib/caseTasks'
import { colors, radii, shadows, space } from '../../src/theme/tokens'

const FALLBACK_PROMPTS = [
  'What are the strongest facts in this case?',
  'What is blocking demand readiness?',
  'What will the insurer attack?',
]

const PRIORITY_COLOR: Record<string, string> = {
  critical: colors.danger,
  high: colors.warning,
  medium: colors.primary,
  low: colors.textSecondary,
}

type Answer = CopilotTurn & { sources: Array<{ label: string; detail: string }> }

export default function CaseAiScreen() {
  const { leadId, tab } = useLocalSearchParams<{ leadId?: string; tab?: string }>()
  const [mode, setMode] = useState<'copilot' | 'rose'>(tab === 'rose' ? 'rose' : 'copilot')

  if (!leadId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Open this from a case.</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.segment}>
        {(['copilot', 'rose'] as const).map((id) => (
          <TouchableOpacity key={id} style={[styles.segmentItem, mode === id && styles.segmentOn]} onPress={() => setMode(id)}>
            <Ionicons name={id === 'copilot' ? 'sparkles-outline' : 'hardware-chip-outline'} size={15} color={mode === id ? '#fff' : colors.text} />
            <Text style={[styles.segmentText, mode === id && styles.segmentTextOn]}>{id === 'copilot' ? 'AI Copilot' : 'Rose'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {mode === 'copilot' ? <CopilotPane leadId={leadId} /> : <RosePane leadId={leadId} />}
    </KeyboardAvoidingView>
  )
}

function CopilotPane({ leadId }: { leadId: string }) {
  const [commandCenter, setCommandCenter] = useState<any>(null)
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const historyRef = useRef<CopilotTurn[]>([])
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    historyRef.current = []
    setAnswers([])
    getLeadCommandCenter(leadId).then(setCommandCenter).catch(() => setCommandCenter(null))
  }, [leadId])

  const suggested: string[] = commandCenter?.copilot?.suggestedPrompts?.length
    ? commandCenter.copilot.suggestedPrompts
    : FALLBACK_PROMPTS
  const readiness = Math.round(Number(commandCenter?.readiness?.score ?? 0))

  async function ask(raw: string) {
    const q = raw.trim()
    if (!q || asking) return
    setQuestion('')
    setAsking(true)
    setError(null)
    try {
      const res = await askCaseCopilot(leadId, q, historyRef.current)
      const turn = { question: q, answer: res.answer, sources: Array.isArray(res.sources) ? res.sources : [] }
      historyRef.current = [...historyRef.current, { question: q, answer: res.answer }].slice(-6)
      setAnswers((current) => [...current, turn])
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setAsking(false)
    }
  }

  return (
    <>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ask about this case</Text>
          <Text style={styles.muted}>
            Answers are grounded in intake, documents, chronology and case activity, with the sources they used.
          </Text>
          <Text style={styles.readiness}>
            Demand readiness <Text style={styles.bold}>{readiness}%</Text>
            {commandCenter?.readiness?.label ? ` · ${commandCenter.readiness.label}` : ''}
          </Text>
          {commandCenter?.nextBestAction?.title ? (
            <Text style={styles.muted}>Next: {commandCenter.nextBestAction.title}</Text>
          ) : null}
        </View>

        {answers.length === 0 && (
          <View style={styles.chips}>
            {suggested.slice(0, 5).map((prompt) => (
              <TouchableOpacity key={prompt} style={styles.chip} onPress={() => void ask(prompt)} disabled={asking}>
                <Text style={styles.chipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {answers.map((turn, i) => (
          <View key={i} style={styles.turn}>
            <Text style={styles.questionText}>{turn.question}</Text>
            <View style={styles.card}>
              <Text style={styles.answerText}>{turn.answer}</Text>
              {turn.sources.map((source) => (
                <View key={`${source.label}:${source.detail.slice(0, 40)}`} style={styles.source}>
                  <Text style={styles.sourceText}>
                    <Text style={styles.bold}>{source.label}: </Text>
                    {source.detail}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        {asking && <ActivityIndicator style={{ marginVertical: space.md }} color={colors.primary} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask about this case…"
          placeholderTextColor={colors.muted}
          editable={!asking}
          onSubmitEditing={() => void ask(question)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.send, (!question.trim() || asking) && { opacity: 0.4 }]}
          onPress={() => void ask(question)}
          disabled={!question.trim() || asking}
          accessibilityLabel="Ask"
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  )
}

function RosePane({ leadId }: { leadId: string }) {
  const [coach, setCoach] = useState<CaseCoach | null>(null)
  const [tasks, setTasks] = useState<CaseTaskRow[]>([])
  const [running, setRunning] = useState(true)
  const [approving, setApproving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const run = useCallback(
    async (announce: boolean) => {
      setRunning(true)
      try {
        const [nextCoach, nextTasks] = await Promise.all([getCaseCoach(leadId), getLeadTasks(leadId)])
        setCoach(nextCoach)
        setTasks(nextTasks)
        if (announce) setMsg({ tone: 'ok', text: 'Rose reviewed this case and updated next actions.' })
      } catch (err: unknown) {
        setMsg({ tone: 'err', text: getApiErrorMessage(err) })
      } finally {
        setRunning(false)
      }
    },
    [leadId]
  )

  useEffect(() => {
    void run(false)
  }, [run])

  const roseTasks = useMemo(
    () => tasks.filter((t) => isAiTask(t.taskType) && !['done', 'completed', 'cancelled'].includes(String(t.status).toLowerCase())),
    [tasks]
  )
  const pending = roseTasks.filter((t) => String(t.reviewStatus || '').toLowerCase() === 'pending')

  async function approve() {
    setApproving(true)
    try {
      const res = await approveAllLeadTasks(leadId)
      setMsg({ tone: 'ok', text: `Approved ${res.approved} task${res.approved === 1 ? '' : 's'} for this case.` })
      setTasks(await getLeadTasks(leadId))
    } catch (err: unknown) {
      setMsg({ tone: 'err', text: getApiErrorMessage(err) })
    } finally {
      setApproving(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rose — AI Case Manager</Text>
        <Text style={styles.muted}>
          Rose reviews this case and raises the next tasks. She spots the work; your team still does it.
        </Text>
        <View style={styles.roseActions}>
          <TouchableOpacity style={[styles.primaryButton, running && { opacity: 0.6 }]} onPress={() => void run(true)} disabled={running}>
            {running ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Run Rose on this case</Text>}
          </TouchableOpacity>
          {pending.length > 0 && (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => void approve()} disabled={approving}>
              {approving ? (
                <ActivityIndicator color={colors.success} />
              ) : (
                <Text style={styles.secondaryButtonText}>Approve pending ({pending.length})</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {msg ? <Text style={msg.tone === 'ok' ? styles.ok : styles.error}>{msg.text}</Text> : null}

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{roseTasks.length}</Text>
          <Text style={styles.statLabel}>Raised by Rose (open)</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{pending.length}</Text>
          <Text style={styles.statLabel}>Pending review</Text>
        </View>
        <TouchableOpacity style={styles.stat} onPress={() => router.push({ pathname: '/(app)/tasks', params: { leadId } })}>
          <Ionicons name="list-outline" size={20} color={colors.primary} />
          <Text style={[styles.statLabel, { color: colors.primary }]}>Open tasks</Text>
        </TouchableOpacity>
      </View>

      {coach ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Case coach</Text>
          {coach.headline ? <Text style={styles.answerText}>{coach.headline}</Text> : null}
          {(coach.insights || []).map((insight) => (
            <View key={insight.key} style={styles.insight}>
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[insight.priority] || colors.muted }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                {insight.why ? <Text style={styles.muted}>{insight.why}</Text> : null}
                {insight.impact ? <Text style={styles.insightImpact}>{insight.impact}</Text> : null}
              </View>
            </View>
          ))}
          {(coach.insights || []).length === 0 ? <Text style={styles.muted}>Nothing needs attention right now.</Text> : null}
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: space.lg, paddingBottom: space.xxl },
  segment: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  segmentOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.text },
  segmentTextOn: { color: '#fff' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: space.xs },
  muted: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  bold: { fontWeight: '700', color: colors.text },
  readiness: { marginTop: space.md, fontSize: 13, color: colors.textSecondary },
  chips: { gap: space.sm, marginBottom: space.md },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: space.md, backgroundColor: colors.card },
  chipText: { fontSize: 14, color: colors.text },
  turn: { marginBottom: space.sm },
  questionText: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.primary + '18', color: colors.text, padding: space.md, borderRadius: radii.md, marginBottom: space.sm, fontSize: 14 },
  answerText: { fontSize: 15, lineHeight: 22, color: colors.text },
  source: { marginTop: space.sm, padding: space.sm, borderRadius: radii.sm, backgroundColor: colors.surface },
  sourceText: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  composer: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  send: { width: 44, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 13, marginBottom: space.md },
  ok: { color: colors.success, fontSize: 13, marginBottom: space.md },
  roseActions: { gap: space.sm, marginTop: space.md },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secondaryButton: { borderWidth: 1, borderColor: colors.success, borderRadius: radii.md, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.successMuted },
  secondaryButtonText: { color: colors.success, fontSize: 14, fontWeight: '800' },
  statRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  insight: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  priorityDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  insightTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  insightImpact: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
})
