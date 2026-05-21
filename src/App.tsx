import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import axios from 'axios'

type AuthView = 'login' | 'register' | 'welcome' | 'admin'

type User = {
  id?: string
  _id?: string
  name: string
  email: string
  role: string
}

function App() {
  const [view, setView] = useState<AuthView>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('USER')
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [editedUsers, setEditedUsers] = useState<Record<string, { name: string; email: string; role: string }>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    if (view === 'login') {
      setMessage('Welcome back! Enter your credentials to sign in.')
      console.log('Login view active')
    } else if (view === 'register') {
      setMessage('Create a new account with your email and password.')
      console.log('Register view active')
    } else if (view === 'admin') {
      setMessage('Admin portal loaded — edit users and manage roles.')
      console.log('Admin view active')
    } else {
      setMessage(`You are signed in as ${user?.name ?? 'Guest'}.`)
      console.log('Welcome view active')
    }

    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setName('')
    setRole('USER')
  }, [view, user])

  useEffect(() => {
    if (view === 'register') {
      setIsValid(
        name.trim().length > 0 &&
        email.trim().length > 0 &&
        password.length >= 6 &&
        password === confirmPassword
      )
    } else {
      setIsValid(email.trim().length > 0 && password.length >= 6)
    }
  }, [name, email, password, confirmPassword, view])

  useEffect(() => {
    if (view === 'admin') {
      void fetchUsers()
    }
  }, [view])

  const getUserId = (user: User) => user.id ?? user._id ?? ''

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:8080/getAllUserRole')
      const allUsers: User[] = response.data.users ?? response.data
      setUsers(allUsers)
      const initialEdited: Record<string, { name: string; email: string; role: string }> = {}
      allUsers.forEach((user) => {
        const userId = getUserId(user)
        if (userId) {
          initialEdited[userId] = {
            name: user.name,
            email: user.email,
            role: user.role,
          }
        }
      })
      setEditedUsers(initialEdited)
    } catch (error) {
      console.error(error)
    }
  }

  const handleSwitch = (target: AuthView) => {
    setView(target)
  }

  const handleLogin =  (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setTimeout(async () => {
      setIsSubmitting(false)
      if (email.length > 0 && password.length > 0) {
        const userFetch = await axios.post("http://localhost:8080/login", { email, password })
        console.log("Login response:", userFetch.data);
        const loggedInUser: User = userFetch.data
        setUser(loggedInUser)
        if (loggedInUser.role === 'ADMIN') {
          setView('admin')
        } else {
          setView('welcome')
        }
        console.log(userFetch)
      } else {
        setMessage('Login failed. Try user@example.com and password123 or use different credentials.')
      }
    }, 600)
  }

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setTimeout(async () => {
      setIsSubmitting(false)
      if (isValid) {
        const userFetch = await axios.post("http://localhost:8080/users", {
          name,
          email,
          password,
          role,
        })
        setUser(userFetch.data.user)
        setView('welcome')
        console.log(userFetch);
      } else {
        setMessage('Registration failed. Make sure your name is entered, your password is at least 6 characters, and both passwords match.')
      }
    }, 600)
  }

  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="auth-top">
          <div>
            <p className="eyebrow">Authentication</p>
            <h1>{view === 'register' ? 'Register' : view === 'login' ? 'Login' : view === 'admin' ? 'Admin' : 'Welcome'}</h1>
            <p className="subtitle">{message}</p>
          </div>
          <div className="auth-toggle">
            <button
              type="button"
              className={view === 'login' ? 'active' : ''}
              onClick={() => handleSwitch('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={view === 'register' ? 'active' : ''}
              onClick={() => handleSwitch('register')}
            >
              Register
            </button>
          </div>
        </div>

        {view === 'welcome' ? (
          <div className="welcome-panel">
            <p className="welcome-message">Welcome, {user?.name ?? 'Guest'}!</p>
            <p className="welcome-text">You are now signed in. Use the button below to return to the login page.</p>
            <button type="button" className="primary-button" onClick={() => { setUser(null); handleSwitch('login') }}>
              Sign out
            </button>
          </div>
        ) : view === 'admin' ? (
          <div className="admin-panel">
            <p className="welcome-message">Admin portal</p>
            <p className="welcome-text">Edit user details and change roles below.</p>
            <div className="user-table">
              <div className="user-row user-row--header">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Actions</span>
              </div>
              {users.map((editableUser) => {
                const userId = getUserId(editableUser)
                const edited = editedUsers[userId] ?? {
                  name: editableUser.name,
                  email: editableUser.email,
                  role: editableUser.role,
                }
                return (
                  <div key={userId} className="user-row">
                    <input
                      type="text"
                      value={edited.name}
                      onChange={(event) => setEditedUsers((prev) => ({
                        ...prev,
                        [userId]: { ...edited, name: event.target.value },
                      }))}
                    />
                    <input
                      type="email"
                      value={edited.email}
                      onChange={(event) => setEditedUsers((prev) => ({
                        ...prev,
                        [userId]: { ...edited, email: event.target.value },
                      }))}
                    />
                    <select
                      value={edited.role}
                      onChange={(event) => setEditedUsers((prev) => ({
                        ...prev,
                        [userId]: { ...edited, role: event.target.value },
                      }))}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={async () => {
                        try {
                          await axios.put(`http://localhost:8080/users/${userId}`, edited)
                          await fetchUsers()
                        } catch (error) {
                          console.error(error)
                        }
                      }}
                    >
                      Save
                    </button>
                  </div>
                )
              })}
            </div>
            <button type="button" className="primary-button" onClick={() => { setUser(null); handleSwitch('login') }}>
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="auth-form">
            {view === 'register' && (
              <label className="auth-field">
                <span>Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  required
                />
              </label>
            )}

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
              />
            </label>

            {view === 'register' && (
              <>
                <label className="auth-field">
                  <span>Confirm Password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                    required
                  />
                </label>

                <label className="auth-field">
                  <span>Role</span>
                  <select value={role} onChange={(event) => setRole(event.target.value)}>
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
        )}
      </div>
    </div>
  )
}

export default App
