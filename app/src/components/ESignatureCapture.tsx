import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react'
import { X, RotateCcw, Download, Check } from 'lucide-react'

const CANVAS_W = 600
const CANVAS_H = 200

interface ESignatureCaptureProps {
  onSignatureCapture: (signatureData: string) => void
  onCancel: () => void
  signatureMethod: 'drawn' | 'typed' | 'clicked'
  onMethodChange: (method: 'drawn' | 'typed' | 'clicked') => void
}

export default function ESignatureCapture({
  onSignatureCapture,
  onCancel,
  signatureMethod,
  onMethodChange,
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
    if (submitError && submitErrorRef.current) {
      submitErrorRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [submitError])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
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

  const handleClickSignature = () => {
    const timestamp = new Date().toISOString()
    setSignatureData(timestamp)
    signatureDataRef.current = timestamp
    setHasSignature(true)
    setSubmitError(null)
  }

  const handleSubmit = () => {
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

  const downloadSignature = () => {
    if (signatureMethod === 'drawn' && signatureDataRef.current) {
      const link = document.createElement('a')
      link.download = `signature-${new Date().toISOString().split('T')[0]}.png`
      link.href = signatureDataRef.current
      link.click()
    }
  }

  // Align with handleSubmit: drawn/clicked/typed all set hasSignature when a value exists; typed still needs trim for the button
  const submitDisabled =
    !hasSignature || (signatureMethod === 'typed' && !typedSignature.trim())

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Electronic Signature</h3>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Choose Signature Method</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => switchMethod('drawn')}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  signatureMethod === 'drawn'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-sm font-medium">Draw Signature</div>
                <div className="text-xs text-gray-500 mt-1">Use mouse or touch</div>
              </button>
              <button
                type="button"
                onClick={() => switchMethod('typed')}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  signatureMethod === 'typed'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-sm font-medium">Type Name</div>
                <div className="text-xs text-gray-500 mt-1">Enter your full name</div>
              </button>
              <button
                type="button"
                onClick={() => switchMethod('clicked')}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  signatureMethod === 'clicked'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-sm font-medium">Click to Sign</div>
                <div className="text-xs text-gray-500 mt-1">Timestamp signature</div>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Signature</label>

            {signatureMethod === 'drawn' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-200 rounded cursor-crosshair w-full touch-none"
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
                <div className="flex items-center justify-between mt-3">
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Clear
                  </button>
                  {hasSignature && signatureData && (
                    <button
                      type="button"
                      onClick={downloadSignature}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                  )}
                </div>
              </div>
            )}

            {signatureMethod === 'typed' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="text"
                  value={typedSignature}
                  onChange={handleTypedSignatureChange}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Please enter your full legal name as it appears on official documents
                </p>
              </div>
            )}

            {signatureMethod === 'clicked' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <button
                  type="button"
                  onClick={handleClickSignature}
                  className={`w-full py-8 px-4 rounded-lg border-2 border-dashed transition-colors ${
                    hasSignature
                      ? 'border-green-400 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {hasSignature ? (
                    <div className="flex items-center justify-center">
                      <Check className="h-6 w-6 mr-2" />
                      Signature Recorded
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-medium">Click to Sign</div>
                        <div className="text-sm text-gray-500 mt-1">Your signature will be timestamped</div>
                      </div>
                    </div>
                  )}
                </button>
                {hasSignature && (
                  <p className="text-xs text-gray-500 mt-2 text-center">Signed on: {new Date().toLocaleString()}</p>
                )}
              </div>
            )}
          </div>

          {submitError && (
            <div
              ref={submitErrorRef}
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
              role="alert"
            >
              {submitError}
            </div>
          )}

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <Check className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Legal Notice</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>By providing your electronic signature, you acknowledge that:</p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>This electronic signature has the same legal effect as a handwritten signature</li>
                    <li>You are authorized to provide this signature</li>
                    <li>You have read and understood the consent document</li>
                    <li>This signature will be stored securely for legal compliance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Signature
          </button>
        </div>
      </div>
    </div>
  )
}
