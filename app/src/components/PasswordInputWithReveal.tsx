import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'

export type PasswordInputWithRevealProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function PasswordInputWithReveal({
  className,
  disabled,
  ...props
}: PasswordInputWithRevealProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={clsx(className, 'pr-10')}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        tabIndex={0}
        className="absolute inset-y-0 right-0 flex items-center justify-center px-2 text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4 shrink-0" aria-hidden /> : <Eye className="h-4 w-4 shrink-0" aria-hidden />}
      </button>
    </div>
  )
}
