import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Pharmacy() {
  const [items] = useState([
    { id: 'b1', name: 'Paracetamol 500mg', dose: '500 mg', price: '$4.99' },
    { id: 'b2', name: 'Ibuprofen 200mg', dose: '200 mg', price: '$6.49' },
    { id: 'b3', name: 'Cetirizine 10mg', dose: '10 mg', price: '$5.49' },
  ])
  const [quantity, setQuantity] = useState(1)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any>(items[0])

  const fetchOrderHistory = async () => {
    try {
      const token = localStorage.getItem('health-link-token')
      const res = await fetch('/api/pharmacy/orders', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setOrderHistory(data.orders || [])
    } catch (e) {
      console.error('Failed to load order history', e)
    }
  }

  useEffect(() => {
    fetchOrderHistory()
  }, [])

  const order = async (item: any) => {
    try {
      const token = localStorage.getItem('health-link-token')
      const res = await fetch('/api/pharmacy/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: item.name, dose: item.dose, quantity, price: item.price }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Order failed')
      }
      await fetchOrderHistory()
      alert(`Ordered ${quantity} × ${item.name} from Bolt Pharmacy`)
    } catch (e) {
      console.error('Order failed', e)
      alert('Order failed — check console for details')
    }
  }

  const cancelOrder = async (id: string) => {
    const token = localStorage.getItem('health-link-token')
    const res = await fetch(`/api/pharmacy/order/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) await fetchOrderHistory()
  }

  return (
    <div className="page pharmacy-page">
      <div className="hero-card">
        <h1>Bolt Pharmacy</h1>
        <p>Quickly order common prescriptions and OTC items from Bolt Pharmacy.</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Available items</h3>
          <div className="pharmacy-order-controls">
            <label>
              Quantity
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              />
            </label>
          </div>
          <ul className="pharmacy-list">
            {items.map((it) => (
              <li key={it.id} className="pharmacy-item">
                <div>
                  <strong>{it.name}</strong>
                  <div className="muted">{it.dose} • {it.price}</div>
                </div>
                <div>
                  <button className="button" onClick={() => order(it)}>Order</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-card">
          <h3>Order history</h3>
          {orderHistory.length === 0 ? (
            <p className="empty-state">No pharmacy orders yet.</p>
          ) : (
            <ul className="pharmacy-history-list">
              {orderHistory.map((order) => (
                <li key={order.id} className="pharmacy-item">
                  <div>
                    <strong>{order.name}</strong>
                    <div className="muted">
                      {order.quantity} × {order.dose} • {order.price} • {new Date(order.orderedAt).toLocaleString()}
                    </div>
                  </div>
                  <button className="button button-danger" onClick={() => cancelOrder(order.id)}>Cancel</button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1">Manage active medications in the <Link to="/medications">Medications</Link> page.</p>
        </div>
      </div>
    </div>
  )
}
