import { useMemo, useRef, useState } from 'react'

type MentionableUser = { id: string; name: string; email: string | null }

type AttorneyDashboardWorkstreamCollaborationProps = {
  threadForm: any
  setThreadForm: any
  handleCreateCommentThread: any
  commentThreads: any[]
  handleSelectCommentThread: any
  selectedThreadId: string | null
  commentLoading: boolean
  threadComments: any[]
  commentMessage: string
  setCommentMessage: any
  handleAddComment: any
  mentionableUsers?: MentionableUser[]
  noteForm: any
  setNoteForm: any
  handleAddNote: any
  noteItems: any[]
}

// Highlight @mentions when displaying a stored comment so they read as mentions.
function renderCommentWithMentions(message: string) {
  const parts = message.split(/(@[A-Za-z0-9._%+\-@]+(?:\s[A-Z][A-Za-z0-9._-]+)?)/g)
  return parts.map((part, index) =>
    part.startsWith('@') ? (
      <span key={index} className="font-semibold text-brand-700">{part}</span>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

export default function AttorneyDashboardWorkstreamCollaboration({
  threadForm,
  setThreadForm,
  handleCreateCommentThread,
  commentThreads,
  handleSelectCommentThread,
  selectedThreadId,
  commentLoading,
  threadComments,
  commentMessage,
  setCommentMessage,
  handleAddComment,
  mentionableUsers = [],
  noteForm,
  setNoteForm,
  handleAddNote,
  noteItems,
}: AttorneyDashboardWorkstreamCollaborationProps) {
  const commentInputRef = useRef<HTMLInputElement>(null)
  const [mention, setMention] = useState<{ open: boolean; query: string; start: number }>({
    open: false,
    query: '',
    start: -1,
  })
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0)

  // Find an "@token" immediately before the caret so we can suggest teammates.
  const detectMention = (value: string, caret: number) => {
    const beforeCaret = value.slice(0, caret)
    const match = beforeCaret.match(/(?:^|\s)@([A-Za-z0-9._-]*)$/)
    if (match) {
      setMention({ open: true, query: match[1], start: caret - match[1].length - 1 })
      setMentionActiveIndex(0)
    } else if (mention.open) {
      setMention({ open: false, query: '', start: -1 })
    }
  }

  const filteredMentions = useMemo(() => {
    if (!mention.open) return []
    const query = mention.query.toLowerCase()
    return mentionableUsers
      .filter((user) => {
        if (!query) return true
        return (
          (user.name || '').toLowerCase().includes(query) ||
          (user.email || '').toLowerCase().includes(query)
        )
      })
      .slice(0, 6)
  }, [mention.open, mention.query, mentionableUsers])

  const insertMention = (user: MentionableUser) => {
    const caret = commentInputRef.current?.selectionStart ?? commentMessage.length
    const before = commentMessage.slice(0, mention.start)
    const after = commentMessage.slice(caret)
    const token = `@${user.name || user.email || 'teammate'} `
    const next = `${before}${token}${after}`
    setCommentMessage(next)
    setMention({ open: false, query: '', start: -1 })
    requestAnimationFrame(() => {
      const pos = (before + token).length
      commentInputRef.current?.focus()
      commentInputRef.current?.setSelectionRange(pos, pos)
    })
  }

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mention.open || filteredMentions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionActiveIndex((i) => (i + 1) % filteredMentions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionActiveIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertMention(filteredMentions[mentionActiveIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setMention({ open: false, query: '', start: -1 })
    }
  }

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Team Collaboration</h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
        <div className="rounded-md border border-gray-100 p-3 space-y-3">
          <div className="font-medium text-gray-900">Case-linked comments</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              value={threadForm.title}
              onChange={(e) => setThreadForm((prev: any) => ({ ...prev, title: e.target.value }))}
              className="input md:col-span-2"
              placeholder="Thread title"
            />
            <select
              value={threadForm.threadType}
              onChange={(e) => setThreadForm((prev: any) => ({ ...prev, threadType: e.target.value }))}
              className="input"
            >
              <option value="general">General</option>
              <option value="decision">Decision</option>
            </select>
          </div>
          <div>
            <button
              onClick={handleCreateCommentThread}
              className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              Create Thread
            </button>
          </div>
          <div className="space-y-2">
            {commentThreads.length === 0 ? (
              <div className="text-gray-500">No comment threads yet.</div>
            ) : (
              commentThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleSelectCommentThread(thread.id)}
                  className={`w-full text-left border rounded-md px-2 py-2 ${
                    selectedThreadId === thread.id ? 'border-brand-300 bg-brand-50' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{thread.title}</div>
                    <span className="text-xs text-gray-500">{thread.threadType}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {thread.summary || 'No summary yet.'}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-md border border-gray-100 p-3 space-y-3">
          <div className="font-medium text-gray-900">Thread discussion</div>
          {!selectedThreadId ? (
            <div className="text-gray-500">Select a thread to view discussion.</div>
          ) : (
            <>
              <div className="text-xs text-gray-500">
                Auto-summary: {commentThreads.find((item) => item.id === selectedThreadId)?.summary || 'Pending'}
              </div>
              <div className="space-y-2 max-h-56 overflow-auto border border-gray-100 rounded-md p-2">
                {commentLoading && threadComments.length === 0 ? (
                  <div className="text-gray-500">Loading comments…</div>
                ) : threadComments.length === 0 ? (
                  <div className="text-gray-500">No comments yet.</div>
                ) : (
                  threadComments.map((comment) => (
                    <div key={comment.id} className="border border-gray-100 rounded-md px-2 py-1">
                      <div className="text-gray-700 whitespace-pre-wrap">{renderCommentWithMentions(comment.message || '')}</div>
                      <div className="text-xs text-gray-500">
                        {comment.authorName || comment.authorEmail || 'Team member'} • {new Date(comment.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="relative">
                  <input
                    ref={commentInputRef}
                    value={commentMessage}
                    onChange={(e) => {
                      setCommentMessage(e.target.value)
                      detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length)
                    }}
                    onKeyDown={handleCommentKeyDown}
                    onBlur={() => window.setTimeout(() => setMention({ open: false, query: '', start: -1 }), 150)}
                    className="input"
                    placeholder="Add a comment — type @ to mention a teammate"
                  />
                  {mention.open && filteredMentions.length > 0 && (
                    <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                      {filteredMentions.map((user, index) => (
                        <li key={user.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              // onMouseDown (before blur) so the click registers.
                              e.preventDefault()
                              insertMention(user)
                            }}
                            className={`flex w-full flex-col items-start px-3 py-2 text-left text-xs ${
                              index === mentionActiveIndex ? 'bg-brand-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className="font-medium text-gray-900">{user.name || 'Teammate'}</span>
                            {user.email && <span className="text-gray-500">{user.email}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {mention.open && mentionableUsers.length === 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 shadow-lg">
                      No teammates available to mention.
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAddComment}
                  disabled={commentLoading}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50"
                >
                  {commentLoading ? 'Posting…' : 'Post Comment'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-sm font-medium text-gray-900 mb-2">Quick notes</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <select
            value={noteForm.noteType}
            onChange={(e) => setNoteForm((prev: any) => ({ ...prev, noteType: e.target.value }))}
            className="input"
          >
            <option value="general">General</option>
            <option value="strategy">Strategy</option>
            <option value="evidence">Evidence</option>
            <option value="update">Update</option>
          </select>
          <input
            value={noteForm.message}
            onChange={(e) => setNoteForm((prev: any) => ({ ...prev, message: e.target.value }))}
            className="input md:col-span-2"
            placeholder="Add a note for your team"
          />
        </div>
        <div className="mt-3">
          <button
            onClick={handleAddNote}
            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Add Note
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {noteItems.length === 0 ? (
            <div className="text-gray-500">No team notes yet.</div>
          ) : (
            noteItems.map((item) => (
              <div key={item.id} className="border border-gray-100 rounded-md px-2 py-1">
                <div className="font-medium">{item.noteType}</div>
                <div className="text-gray-700">{item.message}</div>
                <div className="text-gray-500 text-xs">
                  {item.authorName || item.authorEmail || 'Team member'} • {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
