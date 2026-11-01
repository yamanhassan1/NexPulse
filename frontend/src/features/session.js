import { api } from "../utils/axios"
import { setAuthChecked, setAuthError, setUserData } from "../redux/userSlice"

const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 700

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Restores the session on boot.
 *
 * 401 means "you are genuinely signed out" -> clear the user.
 * Anything else (5xx, timeout, offline) means "we do not know yet" -> retry
 * once, then surface a recoverable error instead of bouncing the user to the
 * sign-in screen and making them think their session expired.
 */
export const bootstrapSession = async (dispatch) => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const { data } = await api.get("/api/me")
      dispatch(setUserData(data ?? null))
      dispatch(setAuthError(null))
      dispatch(setAuthChecked(true))
      return
    } catch (error) {
      const status = error.response?.status

      if (status === 401) {
        dispatch(setUserData(null))
        dispatch(setAuthError(null))
        dispatch(setAuthChecked(true))
        return
      }

      const isLastAttempt = attempt === MAX_ATTEMPTS
      if (!isLastAttempt) {
        await wait(RETRY_DELAY_MS * attempt)
        continue
      }

      console.error(`[me] ${error.message}`)
      dispatch(
        setAuthError(
          status
            ? "NexPulse is having a moment — your session is still safe."
            : "We could not reach NexPulse. Check your connection and try again.",
        ),
      )
      dispatch(setAuthChecked(true))
      return
    }
  }
}
