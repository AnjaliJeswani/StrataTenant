import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import FileManager from './components/files/FileManager'
import BillingDashboard from "./components/billing/BillingDashboard";
import { ToastProvider } from './lib/toast'

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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-xl shadow-sm w-full max-w-xs">
        <h1 className="text-2xl font-bold mb-2 text-slate-50">Strata Tenant</h1>
        <p className="text-slate-400 text-sm mb-6">
          {isSignup ? 'Create an account' : 'Welcome back'}
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border border-slate-700 bg-slate-950 text-slate-50 placeholder-slate-500 rounded p-2 mb-3 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-slate-700 bg-slate-950 text-slate-50 placeholder-slate-500 rounded p-2 mb-4 text-sm"
        />
        <button
          onClick={handleSubmit}
          className="w-full bg-indigo-500 text-white py-2 rounded font-semibold hover:bg-indigo-400 transition"
        >
          {isSignup ? 'Sign Up' : 'Log In'}
        </button>
        <p
          className="text-center text-sm mt-3 text-slate-400 cursor-pointer hover:underline"
          onClick={() => { setIsSignup(!isSignup); setMsg('') }}
        >
          {isSignup ? 'Already have an account? Log in' : 'No account? Sign up'}
        </p>
        {msg && <p className="text-red-400 text-xs mt-3 text-center">{msg}</p>}
      </div>
    </div>
  )
}

function Dashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<'files' | 'billing'>('files')

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900/60 border-b border-slate-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h1 className="font-bold text-lg text-slate-50">Strata Tenant</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400 truncate max-w-[180px] sm:max-w-none">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm text-slate-400 hover:underline shrink-0"
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="bg-slate-900/60 border-b border-slate-800 px-4 sm:px-6 flex gap-6 overflow-x-auto">
        {(['files', 'billing'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 text-sm font-medium capitalize border-b-2 -mb-px transition whitespace-nowrap
              ${tab === t
                ? 'border-indigo-400 text-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="max-w-3xl mx-auto mt-6 px-4 sm:px-0">
        {tab === 'files' ? <FileManager /> : <BillingDashboard />}
      </main>
    </div>
  )
}

function AppInner() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <p className="text-slate-400">Loading...</p>
    </div>
  )
  return user ? <Dashboard /> : <LoginScreen />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </QueryClientProvider>
  )
}