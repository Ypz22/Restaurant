import { useEffect, useRef } from 'react'

// ponytail: polling en vez de Realtime porque anon no puede leer order_rounds /
// table_requests (RLS). Reemplazar por postgres_changes cuando llegue Auth.
export const POLL_INTERVAL_MS = 5_000

/** Ejecuta `task` al montar y cada `intervalMs`; se pausa con la pestaña oculta y consulta al volver. */
export function usePolling(task: () => void | Promise<void>, intervalMs = POLL_INTERVAL_MS, key?: unknown) {
  const taskRef = useRef(task)
  useEffect(() => { taskRef.current = task })

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    const run = () => { void taskRef.current() }
    const start = () => {
      if (timer) return
      run()
      timer = setInterval(run, intervalMs)
    }
    const stop = () => {
      clearInterval(timer)
      timer = undefined
    }
    const onVisibility = () => (document.visibilityState === 'hidden' ? stop() : start())

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs, key])
}
