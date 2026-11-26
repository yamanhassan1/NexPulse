const MESSAGES = {
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/email-already-in-use': 'An account already exists for that email. Sign in instead.',
  'auth/weak-password': 'Use a password of at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/operation-not-allowed':
    'Email and password sign-in is turned off in Firebase. Enable the Email/Password provider, then try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
}

export function authErrorMessage(error, fallback = 'Something went wrong. Try again.') {
  return MESSAGES[error?.code] || fallback
}
