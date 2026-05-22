import { useEffect, useState, useRef, useCallback } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import axios from 'axios'
import type { AxiosError } from 'axios'
import AuthForm from './components/AuthForm'
import AdminPanel from './components/AdminPanel'

type AuthView = 'login' | 'register' | 'welcome' | 'admin'

const API_BASE_URL = 'http://localhost:8080'
const TOKEN_STORAGE_KEY = 'authToken'
const TOKEN_FIELD_NAMES = ['token', 'accessToken', 'access_token', 'jwt', 'jwtToken', 'authToken']

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  }

  return config
})

type User = {
  id?: string
  _id?: string
  name: string
  email: string
  role: string
}

type LoginResponse = Partial<User> & {
  user?: User & { token?: string; accessToken?: string; jwt?: string }
  token?: string
  accessToken?: string
  access_token?: string
  jwt?: string
  jwtToken?: string
  authToken?: string
}

const getUserId = (u: User) => u.id ?? u._id ?? ''

const findTokenInPayload = (value: unknown): string => {
  if (!value || typeof value !== 'object') return ''

  for (const [key, nestedValue] of Object.entries(value)) {
    if (TOKEN_FIELD_NAMES.includes(key) && typeof nestedValue === 'string') {
      return nestedValue
    }
  }

  for (const nestedValue of Object.values(value)) {
    const nestedToken = findTokenInPayload(nestedValue)
    if (nestedToken) return nestedToken
  }

  return ''
}

const getAuthorizationHeader = (headers: unknown): string => {
  if (!headers || typeof headers !== 'object') return ''

  const headerBag = headers as {
    get?: (name: string) => unknown
    authorization?: unknown
    Authorization?: unknown
  }
  const directHeader = headerBag.authorization ?? headerBag.Authorization
  const getterHeader = headerBag.get?.('authorization') ?? headerBag.get?.('Authorization')
  const authorizationHeader = directHeader ?? getterHeader

  return typeof authorizationHeader === 'string' ? authorizationHeader : ''
}

const getTokenFromLoginResponse = (data: LoginResponse, headers: unknown) => (
  findTokenInPayload(data) ||
  getAuthorizationHeader(headers).replace(/^Bearer\s+/i, '')
)

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
  const [editedUsers, setEditedUsers] = useState<Record<string, { name: string; email: string; role: string , id: string }>>({})
  const [notification, setNotification] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [savingUserId, setSavingUserId] = useState('')
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? '')

  useEffect(() => {
    if (view === 'login') {
      setMessage('Welcome back! Enter your credentials to sign in.')
    } else if (view === 'register') {
      setMessage('Create a new account with your email and password.')
    } else if (view === 'admin') {
      setMessage('Admin portal loaded — edit users and manage roles.')
    } else {
      setMessage(`You are signed in as ${user?.name ?? 'Guest'}.`)
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

  const getAuthConfig = useCallback((token = authToken) => (
    token
      ? { headers: { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } }
      : undefined
  ), [authToken])

  const notify = useCallback((text: string) => {
    setNotification(text)
    setTimeout(() => setNotification(''), 3000)
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/getAllUserRole', getAuthConfig())
      const allUsers: User[] = response.data.users ?? response.data;
      console.log("Fetched users:", allUsers);
      setUsers(allUsers)
      const initialEdited: Record<string, { name: string; email: string; role: string; id: string }> = {}
      allUsers.forEach((u) => {
        const id = getUserId(u)
        if (id) initialEdited[id] = { name: u.name, email: u.email, role: u.role, id }
      })
      setEditedUsers(initialEdited)
    } catch (err) {
      console.error(err)
      const axiosError = err as AxiosError<{ message?: string }>
      notify(axiosError.response?.data?.message ?? 'Failed to fetch users')
    }
  }, [getAuthConfig, notify])

  // Fetch users when admin view becomes active
  useEffect(() => {
    if (view === 'admin') {
      console.log('Admin view active — fetching users')
      void fetchUsers()
    }
  }, [view, fetchUsers])

  const handleSave = async (userId: string) => {
    if (!userId) {
      notify('Cannot update user: missing user id')
      return
    }

    const edited = editedUsers[userId]
    if (!edited) {
      notify('No changes found for this user')
      return
    }

    setSavingUserId(userId)
    try {
      console.log(`Saving user ${userId} with data`, edited)
      await api.put(`/users/${userId}`, edited, getAuthConfig())
      setUsers((prev) => prev.map((u) => (getUserId(u) === userId ? { ...u, ...edited, id: userId } : u)))
      setEditedUsers((prev) => ({ ...prev, [userId]: edited }))
      await fetchUsers()
      try {
        const ws = wsRef.current
        
        const updatedUserValue = users.find((u) => getUserId(u) === userId);
        console.log("current User:- ", edited);
        console.log("Updated User:- ", updatedUserValue);
        const messageUserChances = (()=>{
          let tempMessage ='';
          if(updatedUserValue){
            if(updatedUserValue.name !== edited.name){
              tempMessage += `Name changed from ${updatedUserValue.name} to ${edited.name}. `
            }
            if(updatedUserValue.email !== edited.email){
              tempMessage += `Email changed from ${updatedUserValue.email} to ${edited.email}. `
            }
            if(updatedUserValue.role !== edited.role){
              tempMessage += `Role changed from ${updatedUserValue.role} to ${edited.role}. `
            }
            return tempMessage;
          }
        })
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'user_updated', ...edited, id: userId , message: messageUserChances() }))
      } catch (err) {
        console.warn('WS send failed', err)
      }
      notify('User updated')
    } catch (err) {
      console.error(err)
      const axiosError = err as AxiosError<{ message?: string }>
      notify(axiosError.response?.data?.message ?? 'User update failed')
    } finally {
      setSavingUserId('')
    }
  }

  const handleSwitch = (target: AuthView) => setView(target)

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    
    const performLogin = async () => {
      try {
        if (email.length > 0 && password.length > 0) {
          console.log("checking");
          const userFetch = await api.post<LoginResponse>('/login', { email, password })
          const loggedInUser = (userFetch.data.user ?? userFetch.data) as User
          const token = getTokenFromLoginResponse(userFetch.data, userFetch.headers)
          if (token) {
            setAuthToken(token)
            localStorage.setItem(TOKEN_STORAGE_KEY, token)
          } else {
            setAuthToken('')
            localStorage.removeItem(TOKEN_STORAGE_KEY)
            console.warn('Login response did not include a token. If the backend uses cookies, make sure CORS allows credentials.')
          }
          setUser(loggedInUser)
          setView(loggedInUser.role === 'ADMIN' ? 'admin' : 'welcome')
        } else {
          setMessage('Login failed. Try user@example.com and password123 or use different credentials.')
        }
      } catch (err) {
        console.error(err)
        setMessage('Login failed. Try user@example.com and password123 or use different credentials.')
      } finally {
        setIsSubmitting(false)
      }
    }
    
    void performLogin()
  }

  // WebSocket setup: connect only while admin view is active. adds reconnect/cleanup safety.
  useEffect(() => {
    if (view !== 'admin') return

    let mounted = true
    const url = 'ws://localhost:8080'
    let ws: WebSocket | null = null

    const connect = () => {
      if (!mounted) return
      ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => console.log('WS connected')

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          console.log('WS message received', msg);
          if (msg?.type === 'user_updated' && msg.user) {
            const incoming = msg.user as User & { id?: string }
            const incomingId = incoming.id ?? incoming._id
            if (!incomingId) return
            setUsers((prev) => prev.map((u) => (getUserId(u) === incomingId ? { ...u, ...incoming } : u)))
            setEditedUsers((prev) => ({ ...prev, [incomingId]: { name: incoming.name, email: incoming.email, role: incoming.role , id: incomingId } }))
            setNotification(`User ${incoming.name} updated`)
            setTimeout(() => setNotification(''), 3000)
          }
        } catch (err) {
          console.warn('Failed to parse WS message', err)
        }
      }

      ws.onclose = (ev) => {
        console.log('WS closed', ev)
        // try reconnect when still mounted
        if (mounted) setTimeout(() => connect(), 2000)
      }

      ws.onerror = (e) => console.error('WS error', e)
    }

    connect()

    return () => {
      mounted = false
      try {
        if (ws) ws.close()
      } catch {
        /* ignore */
      }
      if (wsRef.current === ws) wsRef.current = null
    }
  }, [view])

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    
    const performRegister = async () => {
      try {
        if (isValid) {
          const userFetch = await api.post('/users', { name, email, password, role })
          const loggedInUser = (userFetch.data.user ?? userFetch.data) as User
          const token = getTokenFromLoginResponse(userFetch.data, userFetch.headers)
          if (token) {
            setAuthToken(token)
            localStorage.setItem(TOKEN_STORAGE_KEY, token)
          }
          setUser(loggedInUser)
          setView('welcome')
        } else {
          setMessage('Registration failed. Make sure your name is entered, your password is at least 6 characters, and both passwords match.')
        }
      } catch (err) {
        console.error(err)
        setMessage('Registration failed due to a server error.')
      } finally {
        setIsSubmitting(false)
      }
    }
    
    void performRegister()
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
            <button type="button" className={view === 'login' ? 'active' : ''} onClick={() => handleSwitch('login')}>Login</button>
            <button type="button" className={view === 'register' ? 'active' : ''} onClick={() => handleSwitch('register')}>Register</button>
          </div>
        </div>

        {view === 'welcome' ? (
          <div className="welcome-panel">
            <p className="welcome-message">Welcome, {user?.name ?? 'Guest'}!</p>
            <p className="welcome-text">You are now signed in. Use the button below to return to the login page.</p>
            <button type="button" className="primary-button" onClick={() => { setUser(null); setAuthToken(''); localStorage.removeItem(TOKEN_STORAGE_KEY); handleSwitch('login') }}>Sign out</button>
          </div>
        ) : view === 'admin' ? (
          <AdminPanel users={users} editedUsers={editedUsers} setEditedUsers={setEditedUsers} handleSave={handleSave} savingUserId={savingUserId} onSignOut={() => { setUser(null); setAuthToken(''); localStorage.removeItem(TOKEN_STORAGE_KEY); handleSwitch('login') }} notification={notification} />
        ) : (
          <AuthForm view={view === 'register' ? 'register' : 'login'} name={name} setName={setName} email={email} setEmail={setEmail} password={password} setPassword={setPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} role={role} setRole={setRole} isValid={isValid} isSubmitting={isSubmitting} onSubmit={view === 'login' ? handleLogin : handleRegister} />
        )}
      </div>
    </div>
  )
}

export default App
