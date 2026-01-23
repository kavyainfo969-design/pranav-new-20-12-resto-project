import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaCheckCircle, FaClock, FaSpinner } from 'react-icons/fa'
import { API_BASE } from '../../utils/apiBase'
import { fetchJson } from '../../utils/fetchJson'
 
const OrderTracking: React.FC = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
 
  // Fetch orders from backend and merge with local orders
  useEffect(() => {
    let mounted = true
    const fetchOrders = async () => {
      try {
        // Fetch from backend
        const { res, json } = await fetchJson(`${API_BASE}/api/orders`)
        if (res.ok && json && Array.isArray(json.orders)) {
          const backendOrders = json.orders.map((o: any) => ({
            id: o._id || o.id,
            serverId: o._id || o.id,
            customerName: (o.user && o.user.name) || (o.customerName) || 'Guest',
            customerEmail: (o.user && o.user.email) || (o.customerEmail) || '',
            items: o.items || [],
            total: o.total || 0,
            status: o.status ? (o.status.charAt(0).toUpperCase() + o.status.slice(1)) : 'Pending',
            createdAt: o.createdAt || new Date().toISOString(),
            paymentStatus: o.paymentStatus || 'pending'
          }))

          // Also load local orders for fallback
          let localOrders: any[] = []
          try {
            const saved = JSON.parse(localStorage.getItem('orders') || '[]')
            localOrders = Array.isArray(saved) ? saved : []
          } catch (e) {
            localOrders = []
          }

          // Merge: prefer backend orders, but include local-only orders
          const backendIds = new Set(backendOrders.map((o: any) => o.id || o.serverId))
          const localOnly = localOrders.filter((lo: any) => {
            const serverId = lo.serverId || lo.id
            return !backendIds.has(serverId) && !backendIds.has(lo.id)
          })

          const merged = [...backendOrders, ...localOnly].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )

          if (mounted) {
            setOrders(merged)
            setLoading(false)
          }
        } else {
          // Fallback to local only
          try {
            const saved = JSON.parse(localStorage.getItem('orders') || '[]')
            if (mounted) {
              setOrders(Array.isArray(saved) ? saved : [])
              setLoading(false)
            }
          } catch (e) {
            if (mounted) {
              setOrders([])
              setLoading(false)
            }
          }
        }
      } catch (err) {
        // Fallback to local only
        try {
          const saved = JSON.parse(localStorage.getItem('orders') || '[]')
          if (mounted) {
            setOrders(Array.isArray(saved) ? saved : [])
            setLoading(false)
          }
        } catch (e) {
          if (mounted) {
            setOrders([])
            setLoading(false)
          }
        }
      }
    }

    fetchOrders()
    sessionStorage.removeItem('paymentInProgress')
    
    // Poll for status updates every 5 seconds
    const intervalId = setInterval(fetchOrders, 5000)
    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [navigate])

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <FaClock className="text-warning me-2" />
      case 'preparing':
        return <FaSpinner className="text-info me-2" style={{ animation: 'spin 1s linear infinite' }} />
      case 'served':
        return <FaCheckCircle className="text-success me-2" />
      default:
        return <FaClock className="text-muted me-2" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#FFC107'
      case 'preparing':
        return '#17A2B8'
      case 'served':
        return '#28A745'
      default:
        return '#6C757D'
    }
  }
 
  if (loading) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading orders...</span>
        </div>
      </div>
    )
  }
 
  return (
    <div className="container py-4 py-md-5" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
 
          <div className="card shadow-lg border-0 rounded-4 p-4">
            <div className="text-center mb-4">
              <FaCheckCircle className="text-success mb-3" size={50} />
              <h3 className="fw-bold mb-1">Order Tracking</h3>
              <p className="text-muted">View your recent orders and their real-time status.</p>
            </div>
 
            {/* Orders list */}
            <div className="mb-3">
              {orders.length === 0 ? (
                <div className="text-center py-4">
                  <p className="mb-1">No orders yet.</p>
                  <small className="text-muted">Once you place orders they will appear here.</small>
                </div>
              ) : (
                <div>
                  <h6 className="mb-3 fw-semibold">Your Orders</h6>
                  <div className="list-group">
                    {orders.map(o => (
                      <div key={o.id || o.serverId} className="list-group-item mb-3 rounded shadow-sm border-0" 
                        style={{ 
                          transition: 'all 0.3s ease',
                          backgroundColor: 'white'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)'
                          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div className="d-flex flex-column">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <div className="fw-bold">Order #{String(o.id || o.serverId || 'N/A').slice(-6)}</div>
                              <div className="text-muted small mt-1">
                                {new Date(o.createdAt || new Date()).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-end">
                              <div className="fw-bold fs-5" style={{ color: '#FF6A00' }}>
                                ₹{(o.total || o.orderTotal || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Status Display */}
                          <div className="mb-2 p-2 rounded" style={{ 
                            backgroundColor: getStatusColor(o.status || 'Pending') + '20',
                            border: `2px solid ${getStatusColor(o.status || 'Pending')}`
                          }}>
                            <div className="d-flex align-items-center">
                              {getStatusIcon(o.status || 'Pending')}
                              <span className="fw-semibold" style={{ color: getStatusColor(o.status || 'Pending') }}>
                                Status: {o.status || 'Pending'}
                              </span>
                            </div>
                          </div>

                          {/* Order Items */}
                          {o.items && o.items.length > 0 && (
                            <div className="mb-2">
                              <small className="text-muted d-block mb-1">Items:</small>
                              {o.items.map((item: any, idx: number) => (
                                <div key={idx} className="small mb-1">
                                  <span className="fw-semibold">{item.name}</span>
                                  <span className="badge bg-light text-dark ms-2">x{item.quantity}</span>
                                  {item.spiceLevel && (
                                    <span className="badge bg-warning text-dark ms-1">{item.spiceLevel}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-2 small text-muted">
                            Payment: {o.paymentLabel || o.paymentMethod || 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link 
              to="/category" 
              className="btn mt-4 w-100 rounded-pill text-white fw-semibold py-2"
              style={{ 
                background: 'linear-gradient(90deg, #FFA500, #FF6B00)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 106, 0, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '3px solid #FF6A00'
                e.currentTarget.style.outlineOffset = '2px'
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none'
              }}
            >
              Back to Home
            </Link>
          </div>
 
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
 
export default OrderTracking