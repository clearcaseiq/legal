import { FolderOpen } from 'lucide-react'
import { formatEnumLabel } from '../../../lib/formatters'

export default function CaseDocumentsPanel({ files }: { files: any[] }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><FolderOpen className="h-5 w-5" />Documents</h2>{files?.length ? <ul className="space-y-2">{files.map((file) => <li key={file.id} className="text-sm">{file.originalName}{file.category ? ` – ${formatEnumLabel(file.category)}` : ''}{file.status ? ` (${formatEnumLabel(file.status)})` : ''}</li>)}</ul> : <p className="text-slate-500">No documents uploaded</p>}</section>
}
