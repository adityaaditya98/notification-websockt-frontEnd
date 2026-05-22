type Props = {
  view: 'login' | 'register'
  name: string
  setName: (v: string) => void
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  confirmPassword: string
  setConfirmPassword: (v: string) => void
  role: string
  setRole: (v: string) => void
  isValid: boolean
  isSubmitting: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export default function AuthForm({
  view,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  role,
  setRole,
  isValid,
  isSubmitting,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="auth-form">
      {view === 'register' && (
        <label className="auth-field">
          <span>Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
        </label>
      )}

      <label className="auth-field">
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
      </label>

      <label className="auth-field">
        <span>Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
      </label>

      {view === 'register' && (
        <>
          <label className="auth-field">
            <span>Confirm Password</span>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required />
          </label>

          <label className="auth-field">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
        </>
      )}

      <button type="submit" className="primary-button" disabled={!isValid || isSubmitting}>
        {isSubmitting ? 'Submitting...' : view === 'login' ? 'Log In' : 'Create Account'}
      </button>
    </form>
  )
}
