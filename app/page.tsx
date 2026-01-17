import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export default async function Home() {
  const authenticated = await isAuthenticated()

  if (authenticated) {
    redirect('/today')
  } else {
    redirect('/login')
  }
}
