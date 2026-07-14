import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../lib/api'

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

export default function BillingDashboard() {
  const { data: usage, refetch } = useQuery({
    queryKey: ['usage'],
    queryFn: () => api.get('/billing/usage').then(r => r.data)
  })

  const pay = useMutation({
    mutationFn: async () => {
      const loaded = await loadRazorpay()
      if (!loaded) { alert('Failed to load payment'); return }

      const { data: order } = await api.post('/billing/pay')
      if (order.message) { alert(order.message); return }

      const rzp = new (window as any).Razorpay({
        key: order.key,
        amount: order.amount_paise,
        currency: 'INR',
        order_id: order.order_id,
        handler: async (response: any) => {
          await api.post('/billing/verify', {
            order_id:   order.order_id,
            payment_id: response.razorpay_payment_id,
            signature:  response.razorpay_signature
          })
          alert('Payment successful! Usage reset to 0.')
          refetch()
        }
      })
      rzp.open()
    }
  })

  if (!usage) return <p className="p-6 text-gray-400">Loading billing...</p>

  const gb = (usage.total_bytes / (1024 ** 3)).toFixed(3)

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Billing</h2>

      <div className="bg-gray-50 rounded-lg p-6 max-w-sm border">
        <p className="text-sm text-gray-500 mb-1">Storage Used</p>
        <p className="text-3xl font-bold mb-4">{gb} GB</p>

        <p className="text-sm text-gray-500 mb-1">Current Bill</p>
        <p className="text-3xl font-bold mb-6">₹{usage.bill_inr}</p>

        {usage.bill_inr > 0 ? (
          <button
            onClick={() => pay.mutate()}
            disabled={pay.isPending}
            className="w-full bg-black text-white py-2 rounded font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {pay.isPending ? 'Processing...' : 'Pay Now'}
          </button>
        ) : (
          <p className="text-green-600 font-medium">
            You are on the free tier
          </p>
        )}
      </div>

      <div className="mt-6 text-xs text-gray-400 space-y-1">
        <p>0 – 5 GB → Free</p>
        <p>5 – 50 GB → ₹2.00 / GB</p>
        <p>50 – 500 GB → ₹1.50 / GB</p>
        <p>500 GB+ → ₹1.00 / GB</p>
      </div>
    </div>
  )
}