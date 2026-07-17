import { useQuery, useMutation } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../lib/api'
import { useToast } from '../../lib/toast'

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if ((window as any).Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

const tiers = [
  { label: 'Free', from: 0, to: 5, rate: '₹0' },
  { label: 'Tier 1', from: 5, to: 50, rate: '₹2.00/GB' },
  { label: 'Tier 2', from: 50, to: 500, rate: '₹1.50/GB' },
  { label: 'Tier 3', from: 500, to: 1000, rate: '₹1.00/GB' },
]
const TIER_CAP = 1000 // GB — visual scale ceiling

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-slate-50">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
    </div>
  )
}

function TierBar({ currentGb }: { currentGb: number }) {
  const pct = Math.min((currentGb / TIER_CAP) * 100, 100)
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pricing tier position</p>
        <p className="font-mono text-xs text-slate-500">{currentGb.toFixed(3)} GB / {TIER_CAP} GB scale</p>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="flex h-full w-full">
          {tiers.map(t => (
            <div
              key={t.label}
              className="h-full border-r border-slate-950/60 last:border-r-0"
              style={{ width: `${((t.to - t.from) / TIER_CAP) * 100}%` }}
            >
              <div className={t.label === 'Free' ? 'h-full w-full bg-emerald-500/30' : 'h-full w-full bg-indigo-500/30'} />
            </div>
          ))}
        </div>
        <div
          className="absolute top-0 h-full w-0.5 bg-indigo-400 shadow-[0_0_6px_1px_rgba(129,140,248,0.8)]"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {tiers.map(t => (
          <span key={t.label} className="font-mono">{t.label} · {t.rate}</span>
        ))}
      </div>
    </div>
  )
}

function WeeklyChart() {
  const { data: weekly, isLoading } = useQuery({
    queryKey: ['usage-weekly'],
    queryFn: () => api.get('/billing/usage/weekly').then(r => r.data)
  })

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        Weekly usage trend
      </p>
      {isLoading ? (
        <div className="h-56 w-full animate-pulse rounded bg-slate-800/50" />
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} unit=" GB" />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number) => [`${value} GB`, 'Usage']}
              />
              <Area type="monotone" dataKey="gb" stroke="#818cf8" fill="url(#usageFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default function BillingDashboard() {
  const { showToast } = useToast()

  const { data: usage, refetch } = useQuery({
    queryKey: ['usage'],
    queryFn: () => api.get('/billing/usage').then(r => r.data)
  })

  const pay = useMutation({
    mutationFn: async () => {
      const loaded = await loadRazorpay()
      if (!loaded) {
        showToast('Failed to load payment gateway', 'error')
        return
      }

      const { data: order } = await api.post('/billing/pay')
      if (order.message) {
        showToast(order.message, 'info')
        return
      }

      const rzp = new (window as any).Razorpay({
        key: order.key,
        amount: order.amount_paise,
        currency: 'INR',
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            await api.post('/billing/verify', {
              order_id: order.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature
            })
            showToast('Payment successful! Usage reset to 0.', 'success')
            refetch()
          } catch {
            showToast('Payment verification failed', 'error')
          }
        }
      })
      rzp.open()
    },
    onError: () => {
      showToast('Something went wrong starting payment', 'error')
    }
  })

  if (!usage) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-50">
        <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
          <div className="h-6 w-24 rounded bg-slate-800" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="h-24 rounded-xl border border-slate-800 bg-slate-900/60" />
            <div className="h-24 rounded-xl border border-slate-800 bg-slate-900/60" />
          </div>
          <div className="h-20 rounded-xl border border-slate-800 bg-slate-900/60" />
          <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/60" />
        </div>
      </div>
    )
  }

  const gb = usage.total_bytes / 1024 ** 3

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-50">
      <div className="mx-auto max-w-3xl space-y-6">
        <h2 className="text-lg font-semibold tracking-tight">Billing</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Storage used" value={`${gb.toFixed(3)} GB`} />
          <StatCard
            label="Current bill"
            value={`₹${usage.bill_inr}`}
            sublabel={usage.bill_inr > 0 ? undefined : 'Free tier'}
          />
        </div>

        <TierBar currentGb={gb} />

        <WeeklyChart />

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          {usage.bill_inr > 0 ? (
            <button
              onClick={() => pay.mutate()}
              disabled={pay.isPending}
              className="w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {pay.isPending ? 'Processing...' : 'Pay now'}
            </button>
          ) : (
            <p className="font-medium text-emerald-400">You are on the free tier</p>
          )}
        </div>
      </div>
    </div>
  )
}