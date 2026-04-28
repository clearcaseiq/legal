import { clearStoredAuth, getLoginRedirect } from './auth'
import { apiDebug } from './debug'
import { getApiOrigin } from './runtimeEnv'

// In Next.js, default to a local API during localhost development and
// honor NEXT_PUBLIC_API_URL in deployed environments.
const baseURL = getApiOrigin()

apiDebug.log('API baseURL:', baseURL)
apiDebug.log('Web origin:', typeof window !== 'undefined' ? window.location.origin : 'unknown')

type ResponseType = 'json' | 'text' | 'blob'

type RequestConfig = {
  baseURL?: string
  data?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | null | undefined>
  responseType?: ResponseType
  timeout?: number
  url?: string
  method?: string
}

type ResponseData<T = any> = {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  config: RequestConfig
}

type ApiError = Error & {
  code?: string
  config?: RequestConfig
  request?: { url: string; method: string }
  response?: ResponseData
}

const DEFAULT_TIMEOUT = 90000

function buildUrl(url: string, params?: RequestConfig['params'], requestBaseUrl?: string) {
  const normalizedBaseUrl = requestBaseUrl ?? baseURL
  const target = url.startsWith('http')
    ? new URL(url)
    : new URL(url, normalizedBaseUrl || window.location.origin)

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    target.searchParams.append(key, String(value))
  })

  if (!normalizedBaseUrl && !url.startsWith('http')) {
    return `${target.pathname}${target.search}`
  }

  return target.toString()
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

function shouldSerializeJson(value: unknown) {
  return value !== undefined &&
    value !== null &&
    !isFormData(value) &&
    !isBlob(value) &&
    !(value instanceof URLSearchParams) &&
    typeof value !== 'string'
}

async function parseResponse(response: Response, responseType: ResponseType) {
  if (responseType === 'blob') return response.blob()
  if (responseType === 'text') return response.text()
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function normalizeHeaders(headers: Headers) {
  return Object.fromEntries(headers.entries())
}

function createApiError(message: string, config: RequestConfig, request: { url: string; method: string }, extras?: Partial<ApiError>): ApiError {
  const error = new Error(message) as ApiError
  error.name = 'ApiError'
  error.config = config
  error.request = request
  Object.assign(error, extras)
  return error
}

async function request<T = any>(method: string, url: string, data?: unknown, config: RequestConfig = {}): Promise<ResponseData<T>> {
  const token = localStorage.getItem('auth_token')
  const lang = localStorage.getItem('i18nextLng') || ''
  const headers = new Headers(config.headers || {})

  if (lang && lang !== 'en') {
    headers.set('X-Language', lang)
  }

  apiDebug.log('API request:', {
    method: method.toUpperCase(),
    url,
    hasToken: !!token,
  })

  if (token) {
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        headers.set('Authorization', `Bearer ${token}`)
        apiDebug.log('Token added to request')
      } else {
        apiDebug.log('Invalid token format, not adding to request')
      }
    } catch (error) {
      apiDebug.error('Error processing token:', error)
    }
  } else {
    apiDebug.log('No token found, proceeding without auth')
  }

  const requestConfig: RequestConfig = {
    ...config,
    data,
    method,
    url,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
  }

  if (
    typeof window !== 'undefined' &&
    !requestConfig.baseURL &&
    !baseURL &&
    !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(window.location.host) &&
    url.startsWith('/v1/')
  ) {
    const message = 'NEXT_PUBLIC_API_URL is not configured for this deployment. Set it to your API origin in Amplify.'
    console.error(`❌ API configuration error: ${message}`)
    throw createApiError(message, requestConfig, { url, method: method.toUpperCase() })
  }

  let body: BodyInit | undefined
  if (isFormData(data)) {
    body = data
    headers.delete('Content-Type')
  } else if (data instanceof URLSearchParams) {
    body = data
  } else if (shouldSerializeJson(data)) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(data)
  } else if (typeof data === 'string') {
    body = data
  } else if (isBlob(data)) {
    body = data
  }

  const requestUrl = buildUrl(url, config.params, config.baseURL)
  const requestMeta = { url: requestUrl, method: method.toUpperCase() }
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), requestConfig.timeout)

  apiDebug.log('Request headers:', Object.fromEntries(headers.entries()))
  apiDebug.log('Request data:', data)

  try {
    const response = await fetch(requestUrl, {
      method: method.toUpperCase(),
      headers,
      body,
      signal: controller.signal,
    })

    const parsed = await parseResponse(response, config.responseType || 'json')
    const normalizedResponse: ResponseData<T> = {
      data: parsed as T,
      status: response.status,
      statusText: response.statusText,
      headers: normalizeHeaders(response.headers),
      config: requestConfig,
    }

    if (!response.ok) {
      const error = createApiError(`Request failed with status ${response.status}`, requestConfig, requestMeta, {
        response: normalizedResponse,
      })
      throw error
    }

    apiDebug.log(`API response: ${method.toUpperCase()} ${url} - ${response.status}`)
    return normalizedResponse
  } catch (rawError: any) {
    const error = rawError?.name === 'ApiError'
      ? rawError as ApiError
      : createApiError(
          rawError?.name === 'AbortError' ? 'Request timeout' : rawError?.message || 'Network request failed',
          requestConfig,
          requestMeta,
          {
            code: rawError?.name === 'AbortError' ? 'ECONNABORTED' : rawError?.code,
          }
        )

    const status = error.response?.status || 'NO_RESPONSE'
    apiDebug.error(`API error: ${method.toUpperCase()} ${url} - ${status}`)
    apiDebug.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      request: error.request ? 'Request made but no response' : 'No request made',
      code: error.code,
      name: error.name
    })

    if (!error.response) {
      apiDebug.error('Network error or server not reachable')
    }

    if (typeof window !== 'undefined' && (error.response?.status === 401 || error.response?.status === 403)) {
      const status = error.response?.status
      const pathname = window.location.pathname || '/'
      const search = window.location.search || ''
      const onLoginPage =
        pathname.startsWith('/login') ||
        pathname === '/attorney-login' ||
        pathname === '/admin-login'
      const fullPath = `${pathname}${search}`
      const errBody = error.response?.data as { code?: string } | undefined
      const errCode = errBody?.code

      // Logged-in users missing legal consents: go fix consents, do not strip auth or send to generic login
      if (status === 403 && errCode === 'REQUIRED_CONSENTS_INCOMPLETE') {
        if (!pathname.startsWith('/auth/complete-consent')) {
          window.location.assign(`/auth/complete-consent?redirect=${encodeURIComponent(fullPath)}`)
        }
        throw error
      }

      if (status === 403 && errCode === 'EMAIL_VERIFICATION_REQUIRED') {
        if (!pathname.startsWith('/profile')) {
          window.location.assign(`/profile?verify=required`)
        }
        throw error
      }

      const hadToken = !!localStorage.getItem('auth_token')
      // Guest case report: never redirect unauthenticated users off /results (session APIs 401 without token)
      const guestOnResults = pathname.startsWith('/results/') && !hadToken
      // Guest evidence flows: same as results — avoid login/register redirect on 401 from optional-auth APIs
      const guestOnEvidence =
        !hadToken &&
        (pathname.startsWith('/evidence-upload/') || pathname.startsWith('/evidence-dashboard'))
      // Post-registration consent save: show error on /register instead of clearing session + sending to login
      const registerConsentSave =
        pathname.startsWith('/register') &&
        method.toLowerCase() === 'post' &&
        (url === '/v1/consent' || url.endsWith('/v1/consent'))

      // Post-login bootstrap: consent status GET must not clear a token we just stored (401/403 would otherwise wipe session before redirect)
      const consentStatusBootstrap =
        method.toLowerCase() === 'get' &&
        typeof url === 'string' &&
        url.includes('/v1/consent/status/') &&
        (onLoginPage || pathname.startsWith('/auth/callback'))

      // Admin login page: failed admin-access check is handled in AdminLogin (do not strip token before UI shows message)
      const adminAccessCheck =
        method.toLowerCase() === 'get' &&
        typeof url === 'string' &&
        (url === '/v1/auth/admin-access' || url.endsWith('/v1/auth/admin-access')) &&
        (pathname.startsWith('/login/admin') || pathname === '/admin-login')

      if (hadToken && status === 401) {
        if (!registerConsentSave && !consentStatusBootstrap && !adminAccessCheck) {
          clearStoredAuth()
        }
      }

      if (status === 403) {
        throw error
      }

      if (!onLoginPage && !guestOnResults && !guestOnEvidence) {
        if (
          !(registerConsentSave && (status === 401 || status === 403)) &&
          !(consentStatusBootstrap && (status === 401 || status === 403)) &&
          !(adminAccessCheck && (status === 401 || status === 403))
        ) {
          window.location.assign(getLoginRedirect(pathname))
        }
      }
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

const api = {
  get<T = any>(url: string, config?: RequestConfig) {
    return request<T>('get', url, undefined, config)
  },
  delete<T = any>(url: string, config?: RequestConfig) {
    return request<T>('delete', url, undefined, config)
  },
  post<T = any>(url: string, data?: unknown, config?: RequestConfig) {
    return request<T>('post', url, data, config)
  },
  put<T = any>(url: string, data?: unknown, config?: RequestConfig) {
    return request<T>('put', url, data, config)
  },
  patch<T = any>(url: string, data?: unknown, config?: RequestConfig) {
    return request<T>('patch', url, data, config)
  },
}

export default api
