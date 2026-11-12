import { describe, expect, it, vi } from 'vitest'

vi.mock('../env', () => ({
  ENV: {
    ZOOM_CLIENT_ID: 'zoom-client-id',
    ZOOM_CLIENT_SECRET: 'zoom-client-secret',
    ZOOM_REDIRECT_URI: 'https://api.clearcaseiq.test/v1/attorney-zoom/callback',
    JWT_SECRET: 'test-jwt-secret',
    API_URL: 'https://api.clearcaseiq.test',
  },
}))

vi.mock('./app-url', () => ({
  webBaseUrl: () => 'https://www.clearcaseiq.test',
}))

import { buildZoomAuthorizeUrl } from './zoom'

describe('buildZoomAuthorizeUrl', () => {
  it('requests the granular scopes configured on a current Zoom General App', () => {
    const url = new URL(buildZoomAuthorizeUrl('attorney-1'))

    expect(url.origin + url.pathname).toBe('https://zoom.us/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('zoom-client-id')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://api.clearcaseiq.test/v1/attorney-zoom/callback',
    )
    expect(url.searchParams.get('scope')?.split(' ').sort()).toEqual(
      ['meeting:write:meeting', 'user:read:user'].sort(),
    )
    expect(url.searchParams.get('state')).toBeTruthy()
  })
})
