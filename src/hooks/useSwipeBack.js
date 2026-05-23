import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Geste "swipe back" depuis le bord gauche (style iOS).
 * Ne déclenche que sur un mouvement horizontal dominant, depuis <24px du bord.
 */
export function useSwipeBack(enabled = true) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') return

    let startX = 0
    let startY = 0
    let tracking = false

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      // Bord gauche uniquement pour éviter les conflits avec le feed vertical
      if (touch.clientX > 24) return
      startX = touch.clientX
      startY = touch.clientY
      tracking = true
    }

    const onTouchMove = (e) => {
      if (!tracking || e.touches.length !== 1) return
      const touch = e.touches[0]
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      // Mouvement principalement horizontal
      if (Math.abs(dx) < 20 || Math.abs(dx) < Math.abs(dy)) return

      // Seuil de déclenchement
      if (dx > 60) {
        tracking = false
        navigate(-1)
      }
    }

    const onTouchEnd = () => {
      tracking = false
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [enabled, navigate])
}

