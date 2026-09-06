import { describe, expect, it } from 'vitest'
import { getLoginPathForRole, getLoginRedirect, getPostLoginRoute } from './auth'

describe('getLoginPathForRole', () => {
  // Every one of these is a distinct sign-in screen backed by a distinct API
  // endpoint, so landing on the wrong one is not a cosmetic slip — the form
  // rejects credentials that are perfectly valid somewhere else.
  it('sends each role to its own sign-in screen', () => {
    expect(getLoginPathForRole('admin')).toBe('/login/admin')
    expect(getLoginPathForRole('attorney')).toBe('/login/attorney')
    expect(getLoginPathForRole('staff')).toBe('/login/staff')
    expect(getLoginPathForRole('specialist')).toBe('/login/specialist')
    expect(getLoginPathForRole('plaintiff')).toBe('/login')
    // What the database actually stores for a claimant.
    expect(getLoginPathForRole('client')).toBe('/login')
    expect(getLoginPathForRole('ADMIN')).toBe('/login/admin')
  })

  // The regression this file exists for: setting a password from an invite used
  // to route an admin to the firm staff login, which is for law-firm employees
  // and refuses admin accounts. New admins could not finish activating.
  it('never routes an admin to the firm staff login', () => {
    expect(getLoginPathForRole('admin')).not.toBe('/login/staff')
    expect(getLoginPathForRole('admin')).not.toBe('/staff-login')
  })

  it('falls back to the client login when the role is unknown', () => {
    expect(getLoginPathForRole(null)).toBe('/login')
    expect(getLoginPathForRole(undefined)).toBe('/login')
    expect(getLoginPathForRole('something-new')).toBe('/login')
  })
})

describe('getLoginRedirect', () => {
  it('preserves the page the visitor was trying to open', () => {
    expect(getLoginRedirect('/admin/users', 'admin')).toBe('/login/admin?redirect=%2Fadmin%2Fusers')
  })

  // Case Assistance is guarded with both roles. Testing admin first sent
  // specialists to a sign-in page that rejects them.
  it('sends Case Assistance to the specialist login even though admins share it', () => {
    expect(getLoginRedirect('/assistance/abc', ['specialist', 'admin'])).toContain('/login/specialist')
    expect(getLoginRedirect('/admin/users', 'admin')).toContain('/login/admin')
  })

  it('picks a login from the path when the route names no role', () => {
    expect(getLoginRedirect('/firm-dashboard')).toContain('/login/staff')
    expect(getLoginRedirect('/attorney-dashboard')).toContain('/login/attorney')
    expect(getLoginRedirect('/dashboard')).toContain('/login/plaintiff')
  })
})

describe('getPostLoginRoute', () => {
  it('lands each role in its own workspace', () => {
    expect(getPostLoginRoute('admin')).toBe('/admin')
    expect(getPostLoginRoute('staff')).toBe('/firm-dashboard')
    expect(getPostLoginRoute('specialist')).toBe('/assistance')
    expect(getPostLoginRoute('plaintiff')).toBe('/dashboard')
  })
})
