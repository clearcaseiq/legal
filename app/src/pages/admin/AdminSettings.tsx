import { Link } from 'react-router-dom'

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/admin/users"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300"
        >
          <p className="font-medium">User roles</p>
          <p className="text-sm text-slate-500">Manage permissions</p>
        </Link>
        <Link
          to="/admin/feature-toggles"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300"
        >
          <p className="font-medium">Feature toggles</p>
          <p className="text-sm text-slate-500">A/B experiments</p>
        </Link>
        <Link
          to="/admin/firm-settings"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300"
        >
          <p className="font-medium">Firm settings</p>
          <p className="text-sm text-slate-500">Law firm configuration</p>
        </Link>
      </div>
    </div>
  )
}
