import { useCallback, useEffect, useState } from 'react'
import {
  createLeadComment,
  createLeadCommentThread,
  getLeadCommentThread,
  getLeadCommentThreads,
} from '../lib/api'

const DEFAULT_THREAD_FORM = {
  title: '',
  threadType: 'general',
}

export function useAttorneyCommentThreads(selectedLeadId?: string) {
  const [commentThreads, setCommentThreads] = useState<any[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [threadComments, setThreadComments] = useState<any[]>([])
  const [threadForm, setThreadForm] = useState(DEFAULT_THREAD_FORM)
  const [commentMessage, setCommentMessage] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  const reloadThreads = useCallback(async () => {
    if (!selectedLeadId) {
      setCommentThreads([])
      return
    }
    try {
      const records = await getLeadCommentThreads(selectedLeadId)
      setCommentThreads(Array.isArray(records) ? records : [])
    } catch (err) {
      console.error('Failed to load comment threads:', err)
      setCommentThreads([])
    }
  }, [selectedLeadId])

  const handleCreateCommentThread = useCallback(async () => {
    if (!selectedLeadId || !threadForm.title.trim()) return
    try {
      const record = await createLeadCommentThread(selectedLeadId, {
        title: threadForm.title.trim(),
        threadType: threadForm.threadType,
      })
      setCommentThreads((prev) => [record, ...prev])
      setThreadForm(DEFAULT_THREAD_FORM)
      setSelectedThreadId(record.id)
      const thread = await getLeadCommentThread(selectedLeadId, record.id)
      setThreadComments(Array.isArray(thread?.comments) ? thread.comments : [])
    } catch (err) {
      console.error('Failed to create comment thread:', err)
    }
  }, [selectedLeadId, threadForm])

  const handleSelectCommentThread = useCallback(async (threadId: string) => {
    if (!selectedLeadId) return
    try {
      setCommentLoading(true)
      setSelectedThreadId(threadId)
      const thread = await getLeadCommentThread(selectedLeadId, threadId)
      setThreadComments(Array.isArray(thread?.comments) ? thread.comments : [])
    } catch (err) {
      console.error('Failed to load thread comments:', err)
      setThreadComments([])
    } finally {
      setCommentLoading(false)
    }
  }, [selectedLeadId])

  const handleAddComment = useCallback(async () => {
    if (!selectedLeadId || !selectedThreadId || !commentMessage.trim()) return
    try {
      setCommentLoading(true)
      const record = await createLeadComment(selectedLeadId, selectedThreadId, {
        message: commentMessage.trim(),
      })
      setThreadComments((prev) => [...prev, record])
      setCommentMessage('')
      const threads = await getLeadCommentThreads(selectedLeadId)
      setCommentThreads(Array.isArray(threads) ? threads : [])
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setCommentLoading(false)
    }
  }, [commentMessage, selectedLeadId, selectedThreadId])

  useEffect(() => {
    setSelectedThreadId(null)
    setThreadComments([])
    void reloadThreads()
  }, [reloadThreads])

  useEffect(() => {
    if (!selectedLeadId || !selectedThreadId) {
      setThreadComments([])
      return
    }
    const loadThread = async () => {
      try {
        setCommentLoading(true)
        const thread = await getLeadCommentThread(selectedLeadId, selectedThreadId)
        setThreadComments(Array.isArray(thread?.comments) ? thread.comments : [])
      } catch (err) {
        console.error('Failed to load thread comments:', err)
        setThreadComments([])
      } finally {
        setCommentLoading(false)
      }
    }
    void loadThread()
  }, [selectedLeadId, selectedThreadId])

  return {
    commentLoading,
    commentMessage,
    commentThreads,
    handleAddComment,
    handleCreateCommentThread,
    handleSelectCommentThread,
    selectedThreadId,
    setCommentMessage,
    setThreadForm,
    threadComments,
    threadForm,
  }
}
