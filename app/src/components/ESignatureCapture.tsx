import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react'
import { RotateCcw, Download, CheckCircle2, ArrowLeft, ArrowRight, Lock, ShieldCheck, Type, PenTool } from 'lucide-react'
import ConsentStepHeader from './ConsentStepHeader'

const CANVAS_W = 600
const CANVAS_H = 200

interface ESignatureCaptureProps {
  onSignatureCapture: (signatureData: string) => void
  onCancel: () => void
  signatureMethod: 'drawn' | 'typed' | 'clicked'
  onMethodChange: (method: 'drawn' | 'typed' | 'clicked') => void
  /** Parent-level save failure (e.g. complete-consent API error). */
  externalError?: string | null
  submitting?: boolean
}

export default function ESignatureCapture({
  onSignatureCapture,
  onCancel,
  signatureMethod,
  onMethodChange,
  externalError = null,
  submitting = false,
}: ESignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureData, setSignatureData] = useState<string>('')
  const [typedSignature, setTypedSignature] = useState('')
  const [hasSignature, setHasSignature] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submitErrorRef = useRef<HTMLDivElement>(null)

  /** Avoid stale reads if submit fires in an edge timing window */
  const signatureDataRef = useRef(signatureData)
  const typedSignatureRef = useRef(typedSignature)
  signatureDataRef.current = signatureData
  typedSignatureRef.current = typedSignature

  useEffect(() => {
    const err = externalError || submitError
    if (err && submitErrorRef.current) {
      submitErrorRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [externalError, submitError])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    ctx.strokeStyle = '#1f2937'
    // A 2px stroke on the 600px backing canvas rendered thin/faint, which read
    // as "unclear" once drawn and downloaded (#80). A slightly bolder stroke
    // keeps the signature legible at any export size.
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  /** Init / reset canvas whenever we land on "drawn" (mount or tab switch). */
  useLayoutEffect(() => {
    if (signatureMethod === 'drawn') {
      clearCanvas()
    }
  }, [signatureMethod, clearCanvas])

  const resetSignatureState = useCallback(() => {
    setSignatureData('')
    setTypedSignature('')
    setHasSignature(false)
    setIsDrawing(false)
    setSubmitError(null)
    clearCanvas()
  }, [clearCanvas])

  /** Only reset when user picks a different method — not on every mount (avoids racing stopDrawing). */
  const switchMethod = (next: 'drawn' | 'typed' | 'clicked') => {
    if (next === signatureMethod) return
    resetSignatureState()
    onMethodChange(next)
  }

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (clientX: number, clientY: number) => {
    if (signatureMethod !== 'drawn') return

    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getCanvasCoords(clientX, clientY)

    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (clientX: number, clientY: number) => {
    if (!isDrawing || signatureMethod !== 'drawn') return

    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getCanvasCoords(clientX, clientY)

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    if (signatureMethod !== 'drawn') return
    const canvas = canvasRef.current
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png')
      setSignatureData(dataURL)
      signatureDataRef.current = dataURL
      setHasSignature(true)
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (signatureMethod !== 'drawn') return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    startDrawing(e.clientX, e.clientY)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (signatureMethod !== 'drawn' || !isDrawing) return
    e.preventDefault()
    draw(e.clientX, e.clientY)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (signatureMethod !== 'drawn') return
    e.preventDefault()
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    stopDrawing()
  }

  const onLostPointerCapture = () => {
    if (signatureMethod === 'drawn' && isDrawing) {
      stopDrawing()
    }
  }

  /** Touch fallback (older Safari / some WebViews) */
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureMethod !== 'drawn') return
    e.preventDefault()
    const t = e.touches[0]
    if (!t) return
    startDrawing(t.clientX, t.clientY)
  }

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureMethod !== 'drawn' || !isDrawing) return
    e.preventDefault()
    const t = e.touches[0]
    if (!t) return
    draw(t.clientX, t.clientY)
  }

  const onTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureMethod !== 'drawn') return
    e.preventDefault()
    stopDrawing()
  }

  const clearSignature = () => {
    resetSignatureState()
  }

  const handleTypedSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTypedSignature(value)
    typedSignatureRef.current = value
    setHasSignature(value.length > 0)
    setSubmitError(null)
  }

  const handleSubmit = () => {
    if (submitting) return
    setSubmitError(null)
    let finalSignature = ''

    switch (signatureMethod) {
      case 'drawn':
        finalSignature = signatureDataRef.current
        break
      case 'typed':
        finalSignature = typedSignatureRef.current.trim()
        break
      case 'clicked':
        finalSignature = signatureDataRef.current
        break
    }

    if (!finalSignature) {
      setSubmitError('Add a signature using the selected method, then try again.')
      return
    }

    try {
      onSignatureCapture(finalSignature)
    } catch (err) {
      console.error(err)
      setSubmitError('Could not submit signature. Please try again.')
    }
  }

  const visibleError = externalError || submitError

  const downloadSignature = () => {
    const canvas = canvasRef.current
    if (signatureMethod !== 'drawn' || !signatureDataRef.current || !canvas) return
    // The drawn signature is captured on a transparent canvas, which looks
    // unclear/invisible in most image viewers once downloaded. Flatten it onto
    // a white background before exporting so the saved PNG is crisp (#80).
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const exportCtx = exportCanvas.getContext('2d')
    if (exportCtx) {
      exportCtx.fillStyle = '#ffffff'
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
      exportCtx.drawImage(canvas, 0, 0)
    }
    const link = document.createElement('a')
    link.download = `signature-${new Date().toISOString().split('T')[0]}.png`
    link.href = exportCtx ? exportCanvas.toDataURL('image/png') : signatureDataRef.current
    link.click()
  }

  // Align with handleSubmit: drawn/clicked/typed all set hasSignature when a value exists; typed still needs trim for the button
  const submitDisabled =
    submitting || !hasSignature || (signatureMethod === 'typed' && !typedSignature.trim())

  const legalNameValid = typedSignature.trim().length > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-stretch sm:items-center justify-center z-[110] overflow-y-auto p-0 sm:p-4">
      <div className="bg-white sm:rounded-2xl shadow-xl w-full sm:max-w-2xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)] overflow-y-auto flex flex-col">
        <ConsentStepHeader activeStep={2} />

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          <h3 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">Sign your agreements</h3>
          <p className="mx-auto mt-1.5 max-w-md text-center text-sm text-gray-600">
            Your signature will be applied to the three agreements you just reviewed.
          </p>

          <div className="mt-5 rounded-xl border border-gray-200 p-4 sm:p-5">
            <p className="text-sm font-semibold text-gray-900">Choose how you&apos;d like to sign</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => switchMethod('typed')}
                aria-pressed={signatureMethod === 'typed'}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  signatureMethod === 'typed'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Type className={`h-5 w-5 shrink-0 ${signatureMethod === 'typed' ? 'text-blue-600' : 'text-gray-500'}`} aria-hidden />
                <span>
                  <span className={`block text-sm font-medium ${signatureMethod === 'typed' ? 'text-blue-700' : 'text-gray-900'}`}>
                    Type my name
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">Easiest and fastest</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => switchMethod('drawn')}
                aria-pressed={signatureMethod === 'drawn'}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  signatureMethod === 'drawn'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <PenTool className={`h-5 w-5 shrink-0 ${signatureMethod === 'drawn' ? 'text-blue-600' : 'text-gray-500'}`} aria-hidden />
                <span>
                  <span className={`block text-sm font-medium ${signatureMethod === 'drawn' ? 'text-blue-700' : 'text-gray-900'}`}>
                    Draw signature
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">Use your mouse or finger</span>
                </span>
              </button>
            </div>

            {signatureMethod === 'typed' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="legal-name" className="block text-sm font-medium text-gray-700">
                    Your legal name
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="legal-name"
                      type="text"
                      value={typedSignature}
                      onChange={handleTypedSignatureChange}
                      placeholder="Enter your full legal name"
                      className="w-full rounded-md border border-gray-300 px-3 py-2.5 pr-10 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {legalNameValid && (
                      <CheckCircle2
                        className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Signature preview</p>
                  <div className="mt-1.5 flex min-h-[110px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4">
                    <span
                      className={`text-4xl ${legalNameValid ? 'text-gray-800' : 'text-gray-300'}`}
                      style={{ fontFamily: "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive" }}
                    >
                      {legalNameValid ? typedSignature : 'Your signature'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {signatureMethod === 'drawn' && (
              <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-4">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-200 rounded cursor-crosshair w-full touch-none bg-white"
                  style={{ maxWidth: '100%', height: `${CANVAS_H}px` }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onLostPointerCapture={onLostPointerCapture}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                />
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Clear
                  </button>
                  {hasSignature && signatureData && (
                    <button
                      type="button"
                      onClick={downloadSignature}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </button>
                  )}
                </div>
              </div>
            )}

            {visibleError && (
              <div
                ref={submitErrorRef}
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                {visibleError}
              </div>
            )}

            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
              <p className="text-sm text-amber-800">
                By selecting &ldquo;Sign &amp; Finish&rdquo;, you intend to electronically sign the Terms of Service,
                Privacy Policy, and HIPAA Authorization displayed on the previous screen.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                'Saving…'
              ) : (
                <>
                  <Lock className="h-4 w-4" aria-hidden />
                  Sign &amp; Finish
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
            </div>
          </div>

          <p className="mt-4 flex items-start justify-center gap-1.5 text-center text-xs text-gray-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Your signed agreements and signature record will be securely stored, and you&apos;ll receive copies by email.
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
