export async function register() {
  // Only run the scheduler in the Node.js runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initScheduler } = await import('./lib/scheduler')
    await initScheduler()
  }
}
