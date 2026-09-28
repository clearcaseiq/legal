import { useState, type InputHTMLAttributes } from 'react'
import { formatPhoneInput, parsePhone, validatePhoneField } from '../lib/phone'

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'required'>

export interface PhoneInputProps extends NativeProps {
  value: string | null | undefined
  onChange: (value: string) => void
  required?: boolean
  /** Error from the parent (e.g. a failed submit); shown even before blur. */
  error?: string | null
  wrapperClassName?: string
}

/** Stored numbers (often E.164) render in the same "(555) 555-0100" shape users type. */
export function displayPhone(value: string | null | undefined): string {
  const raw = String(value ?? '')
  const parsed = parsePhone(raw)
  return parsed.valid && parsed.e164?.startsWith('+1') && parsed.national ? parsed.national : raw
}

/**
 * Phone field with as-you-type US formatting ("(555) 555-0100"), "+" for
 * international numbers, and an inline error once the user leaves the field.
 * Forms should still call `validatePhoneField` before submitting.
 */
export default function PhoneInput({
  value,
  onChange,
  required,
  error,
  wrapperClassName,
  className = '',
  placeholder = '(555) 555-0100',
  onBlur,
  ...rest
}: PhoneInputProps) {
  const [touched, setTouched] = useState(false)
  const message = error || (touched ? validatePhoneField(value, { required }) : undefined)

  return (
    <div className={wrapperClassName}>
      <input
        {...rest}
        type="tel"
        inputMode="tel"
        autoComplete={rest.autoComplete ?? 'tel'}
        maxLength={rest.maxLength ?? 20}
        required={required}
        value={displayPhone(value)}
        placeholder={placeholder}
        onChange={(e) => onChange(formatPhoneInput(e.target.value))}
        onBlur={(e) => {
          setTouched(true)
          onBlur?.(e)
        }}
        aria-invalid={message ? true : undefined}
        className={`${className} ${message ? '!border-red-400 focus:!ring-red-200' : ''}`.trim()}
      />
      {message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null}
    </div>
  )
}
