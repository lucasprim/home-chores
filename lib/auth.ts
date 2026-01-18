import { cookies } from 'next/headers'

const AUTH_COOKIE_NAME = 'home-chores-auth'
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

// Allow disabling secure cookies for LAN deployments without HTTPS
const SECURE_COOKIES = process.env.SECURE_COOKIES !== 'false'

export async function verifyPin(pin: string): Promise<boolean> {
  const correctPin = process.env.APP_PIN || '1234'
  return pin === correctPin
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies()
  const expiresAt = new Date(Date.now() + SESSION_DURATION)

  cookieStore.set(AUTH_COOKIE_NAME, 'authenticated', {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(AUTH_COOKIE_NAME)
  return session?.value === 'authenticated'
}
