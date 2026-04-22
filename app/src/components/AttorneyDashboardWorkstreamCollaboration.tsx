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
  noteForm: any
  setNoteForm: any
  handleAddNote: any
  noteItems: any[]
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
  noteForm,
  setNoteForm,
  handleAddNote,
  noteItems,
}: AttorneyDashboardWorkstreamCollaborationProps) {
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
                      <div className="text-gray-700">{comment.message}</div>
                      <div className="text-xs text-gray-500">
                        {comment.authorName || comment.authorEmail || 'Team member'} • {new Date(comment.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input
                  value={commentMessage}
                  onChange={(e) => setCommentMessage(e.target.value)}
                  className="input"
                  placeholder="Add a comment (use @mention)"
                />
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
