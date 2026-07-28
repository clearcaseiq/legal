/**
 * Identity for work the AI produced on its own, so an attorney can tell at a
 * glance which tasks came from Rose and which came from a teammate.
 *
 * Rose is the same assistant claimants meet at intake (see rose-engine.ts); she
 * carries through to case management rather than being a second persona.
 *
 * Worth being precise about what this marks: Rose *raises* these tasks, she does
 * not carry them out. Every one is assigned to a real paralegal or attorney. The
 * badge answers "who put this on my board", not "who is doing it".
 */

/** Shown wherever a task's creator is displayed. */
export const AI_AUTHOR_NAME = 'Rose (AI Case Manager)'

/** Short form, for badges and other tight spaces. */
export const AI_AUTHOR_SHORT_NAME = 'Rose'

/**
 * Task types only ever written by the autonomous loop. Everything a human
 * creates — including the one-click "act on this suggestion" buttons in the
 * intelligence and coach panels — is written as 'general', so these two values
 * are a reliable "Rose raised this by herself" signal.
 */
export const AI_TASK_TYPES = ['coach', 'question'] as const

export function isAiGeneratedTask(taskType?: string | null): boolean {
  return (AI_TASK_TYPES as readonly string[]).includes(String(taskType || ''))
}

/**
 * Creator name to display for a task.
 *
 * `createdByName` is unreliable on AI tasks: the loop runs on events, so it
 * captures whoever happened to upload the document or save the answer that
 * triggered it, and captures nobody at all on the periodic sweep. Either way the
 * task reads as though a person wrote it. The stored value is left alone (it is
 * a useful record of what triggered the run); this only fixes what is shown.
 */
export function taskCreatorName(
  task: { taskType?: string | null; createdByName?: string | null },
): string | null {
  if (isAiGeneratedTask(task.taskType)) return AI_AUTHOR_NAME
  return task.createdByName ?? null
}
