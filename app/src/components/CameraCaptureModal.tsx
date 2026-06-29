import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X } from 'lucide-react'

type CameraCaptureModalProps = {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

/**
 * Real camera capture using getUserMedia so "Take Photo" opens the webcam on
 * desktop too (#10). The native <input capture> attribute is ignored on desktop
 * browsers, so this provides a live preview + capture flow, and falls back to a
 * device file picker when the camera API is unavailable or permission is denied
 * (e.g. insecure origin, no camera, or the user blocks access).
 */
export function CameraCaptureModal({ open, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fallbackInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const pendingFileRef = useRef<File | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startStream = useCallback(async () => {
    setError(null)
    setPreviewUrl(null)
    pendingFileRef.current = null
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser can’t access the camera here. You can still choose a photo from your device.')
      return
    }
    setStarting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
    } catch {
      setError('We couldn’t open the camera. Please allow camera access, or choose a photo from your device.')
      stopStream()
    } finally {
      setStarting(false)
    }
  }, [stopStream])

  useEffect(() => {
    if (open) {
      void startStream()
    }
    return () => {
      stopStream()
    }
  }, [open, startStream, stopStream])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleClose = () => {
    stopStream()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    pendingFileRef.current = null
    onClose()
  }

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, width, height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        pendingFileRef.current = file
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(URL.createObjectURL(blob))
        stopStream()
      },
      'image/jpeg',
      0.92,
    )
  }

  const handleUsePhoto = () => {
    const file = pendingFileRef.current
    if (!file) return
    onCapture(file)
    handleClose()
  }

  const handleFallbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) {
      onCapture(file)
      handleClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Take a photo"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Camera className="h-5 w-5 text-green-600" aria-hidden /> Take a photo
          </h3>
          <button type="button" onClick={handleClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-black">
          <div className="relative flex aspect-[4/3] items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Captured preview" className="h-full w-full object-contain" />
            ) : (
              <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />
            )}
            {starting && !error && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Starting camera…</p>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/90">
                {error}
              </div>
            )}
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3">
          {error ? (
            <button
              type="button"
              onClick={() => fallbackInputRef.current?.click()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Choose from device
            </button>
          ) : previewUrl ? (
            <>
              <button
                type="button"
                onClick={() => { void startStream() }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" /> Retake
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Use photo
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCapture}
              disabled={starting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <Camera className="h-4 w-4" /> Capture
            </button>
          )}
        </div>

        <input
          ref={fallbackInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFallbackChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
