import { useEffect, useRef } from 'react'

/**
 * Custom hook for setInterval with proper cleanup
 * @param {Function} callback - Function to call on each interval
 * @param {number|null} delay - Interval in ms, or null to pause
 */
export function useInterval(callback, delay) {
  const savedCallback = useRef(callback)

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval
  useEffect(() => {
    if (delay === null) return

    const tick = () => savedCallback.current()
    const id = setInterval(tick, delay)

    return () => clearInterval(id)
  }, [delay])
}

export default useInterval
