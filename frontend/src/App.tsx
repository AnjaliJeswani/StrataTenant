import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import FileManager from './components/files/FileManager'
import BillingDashboard from "./components/billing/BillingDashboard";

const queryClient = new QueryClient()

function LoginScreen() {
  const { login, signup } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSubmit = async () => {
    const { error } = isSignup
      ? await signup(email, password)
      : await login(email, password)
    if (error) setMsg(error.message)
    else if (isSignup) setMsg('Check your email to confirm signup')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-sm w-80">
        <h1 className="text-2xl font-bold mb-2">Nexus Storage</h1>
        <p className="text-gray-400 text-sm mb-6">
          {isSignup ? 'Create an account' : 'Welcome back'}
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded p-2 mb-3 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded p-2 mb-4 text-sm"
        />
        <button
          onClick={handleSubmit}
          className="w-full bg-black text-white py-2 rounded font-semibold hover:bg-gray-800"
        >
          {isSignup ? 'Sign Up' : 'Log In'}
        </button>
        <p
          className="text-center text-sm mt-3 text-gray-500 cursor-pointer hover:underline"
          onClick={() => { setIsSignup(!isSignup); setMsg('') }}
        >
          {isSignup ? 'Already have an account? Log in' : 'No account? Sign up'}
        </p>
        {msg && <p className="text-red-500 text-xs mt-3 text-center">{msg}</p>}
      </div>
    </div>
  )
}

function Dashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<'files' | 'billing'>('files')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="font-bold text-lg">Nexus Storage</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:underline"
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="bg-white border-b px-6 flex gap-6">
        {(['files', 'billing'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 text-sm font-medium capitalize border-b-2 -mb-px
              ${tab === t
                ? 'border-black text-black'
                : 'border-transparent text-gray-500'
              }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="max-w-3xl mx-auto mt-6">
        {tab === 'files' ? <FileManager /> : <BillingDashboard />}
      </main>
    </div>
  )
}

function AppInner() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )
  return user ? <Dashboard /> : <LoginScreen />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  )
}