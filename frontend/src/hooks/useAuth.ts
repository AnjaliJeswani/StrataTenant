import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const login = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password })

  const signup = (email: string, password: string) =>
    supabase.auth.signUp({ email, password })

  const logout = () => supabase.auth.signOut()

  return { user, loading, login, signup, logout }
}