import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { FaPlus, FaMinus, FaShoppingCart, FaArrowLeft, FaTrash } from 'react-icons/fa'
 
const Cart: React.FC = () => {
  const { cart, updateQuantity, getTotalPrice, clearCart, removeFromCart, isOnline } = useCart()
  const navigate = useNavigate()
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | null>(() => {
    const saved = sessionStorage.getItem('orderType')
    return saved ? (saved === 'dine-in' ? 'dine-in' : 'takeaway') : null
  })
 
  const handleQuantityChange = (id: number, newQty: number) => {
    if (!isOnline) {
      alert('No internet connection. Please reconnect to update your cart.')
      return
    }
    if (newQty <= 0) removeFromCart(id)
    else updateQuantity(id, newQty)
  }
 
  if (cart.length === 0) {
    return (
      <div className="container py-5 text-center">
        <FaShoppingCart className="text-muted fs-1 mb-4" />
        <h2 className="fw-bold mb-3">Your cart is empty</h2>
        <p className="text-muted mb-4">Add something tasty from our menu!</p>
        <Link
          to="/category"
          className="btn rounded-pill px-4 text-white text-decoration-none"
          style={{
            background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
            border: 'none'
          }}
        >
          Browse Menu
        </Link>
      </div>
    )
  }
 
  return (
    <div className="container py-4 py-md-5" style={{ overflowX: 'hidden', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* 🧭 Header */}
      <div className="d-flex align-items-center mb-4">
        <Link
          to="/menu"
          className="btn btn-outline-secondary me-3 rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '40px', height: '40px' }}
        >
          <FaArrowLeft />
        </Link>
        <h1
          className="h4 fw-bold mb-0"
          style={{
            background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Your Order
        </h1>
      </div>
 
      <div className="row g-4">
        {/* 🧺 Cart Items */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-lg rounded-4" style={{ transition: 'all 0.3s ease' }}>
            <div className="card-body p-3 p-md-4" style={{ overflowX: 'hidden' }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="d-flex align-items-center justify-content-between border-bottom py-3 flex-wrap flex-md-nowrap"
                  style={{ 
                    gap: '10px', 
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa'
                    e.currentTarget.style.transform = 'translateX(5px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  {/* 🖼️ Image + Details */}
                  <div
                    className="d-flex align-items-center flex-grow-1"
                    style={{ minWidth: '180px', overflow: 'hidden', flexShrink: 1 }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="rounded"
                      style={{
                        width: '55px',
                        height: '55px',
                        objectFit: 'cover',
                        border: '2px solid #f3f3f3',
                        flexShrink: 0
                      }}
                    />
                    <div className="ms-3 text-truncate" style={{ maxWidth: '120px' }}>
                      <h6 className="fw-semibold mb-0 text-truncate" style={{ fontSize: '15px' }}>
                        {item.name}
                      </h6>
                      {/* <small className="text-muted" style={{ fontSize: '12px' }}>
                        Spice: {item.spiceLevel || 'Medium'}
                      </small> */}
                    </div>
                  </div>
 
                  {/* 🔢 Quantity Control */}
                  <div
                    className="d-flex align-items-center justify-content-center rounded-pill"
                    style={{
                      background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                      border: 'none',
                      padding: '4px 10px',
                      minWidth: '80px',
                      flexShrink: 0
                    }}
                  >
                    <button
                      className="btn btn-sm text-white fw-bold p-0"
                      style={{ background: 'transparent', border: 'none', fontSize: '12px' }}
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      tabIndex={0}
                      onFocus={(e) => e.currentTarget.style.outline = '2px solid #fff'}
                      onBlur={(e) => e.currentTarget.style.outline = 'none'}
                    >
                      <FaMinus />
                    </button>
                    <span
                      className="fw-bold text-white mx-2"
                      style={{ fontSize: '14px', minWidth: '15px', textAlign: 'center' }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      className="btn btn-sm text-white fw-bold p-0"
                      style={{ background: 'transparent', border: 'none', fontSize: '12px' }}
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      tabIndex={0}
                      onFocus={(e) => e.currentTarget.style.outline = '2px solid #fff'}
                      onBlur={(e) => e.currentTarget.style.outline = 'none'}
                    >
                      <FaPlus />
                    </button>
                  </div>
 
                  {/* 💰 Price */}
                  <div
                    className="fw-bold mx-2 text-nowrap"
                    style={{
                      color: '#FF6A00',
                      fontSize: '15px',
                      minWidth: '70px',
                      textAlign: 'right',
                      flexShrink: 0
                    }}
                  >
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
 
                  {/* 🗑️ Delete Icon */}
                  <button
                    className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      flexShrink: 0, 
                      position: 'relative', 
                      zIndex: 10,
                      marginLeft: '8px'
                    }}
                    onClick={() => handleQuantityChange(item.id, 0)}
                    title="Remove item"
                    tabIndex={0}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '3px solid #dc3545'
                      e.currentTarget.style.outlineOffset = '3px'
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(220, 53, 69, 0.25)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <FaTrash size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
 
        {/* 🧾 Order Summary */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-lg rounded-4 sticky-top" style={{ top: '20px', transition: 'all 0.3s ease' }}>
            <div
              className="card-header text-white rounded-top-4"
              style={{ background: 'linear-gradient(90deg, #FF6A00, #FF9900)', padding: '20px' }}
            >
              <h5 className="mb-0 fw-bold">Order Summary</h5>
            </div>
 
            <div className="card-body p-4">
              {/* Order Type Selection */}
              <div className="mb-4">
                <h6 className="fw-semibold mb-3">Select Order Type</h6>
                <div className="d-flex gap-2">
                  <button
                    className={`btn flex-fill rounded-pill fw-semibold ${
                      orderType === 'dine-in' ? 'text-white' : 'btn-outline-primary'
                    }`}
                    style={
                      orderType === 'dine-in'
                        ? { background: 'linear-gradient(90deg, #FF6A00, #FF9900)', border: 'none' }
                        : {}
                    }
                    onClick={() => {
                      setOrderType('dine-in')
                      sessionStorage.setItem('orderType', 'dine-in')
                    }}
                  >
                    🍽️ Dine In
                  </button>

                  {/* ✅ Takeaway instead of Delivery */}
                  <button
                    className={`btn flex-fill rounded-pill fw-semibold ${
                      orderType === 'takeaway' ? 'text-white' : 'btn-outline-primary'
                    }`}
                    style={
                      orderType === 'takeaway'
                        ? { background: 'linear-gradient(90deg, #FF6A00, #FF9900)', border: 'none' }
                        : {}
                    }
                    onClick={() => {
                      setOrderType('takeaway')
                      sessionStorage.setItem('orderType', 'takeaway')
                    }}
                  >
                    👜 Takeaway
                  </button>
                </div>
              </div>

              {/* 💰 Price Details */}
              <div className="d-flex justify-content-between mb-3">
                <span>Subtotal:</span>
                <span
                  className="fw-bold"
                  style={{
                    background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  ₹{getTotalPrice().toFixed(2)}
                </span>
              </div>

              <div className="d-flex justify-content-between mb-3">
                <span>Tax (5%):</span>
                <span
                  className="fw-bold"
                  style={{
                    background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  ₹{(getTotalPrice() * 0.05).toFixed(2)}
                </span>
              </div>

              <hr />

              <div className="d-flex justify-content-between mb-4">
                <span className="fw-bold fs-5">Total Amount:</span>
                <span
                  className="fw-bold fs-5"
                  style={{
                    background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  ₹{(getTotalPrice() + getTotalPrice() * 0.05).toFixed(2)}
                </span>
              </div>

              {orderType === 'dine-in' ? (
                <button
                  className="btn w-100 mb-2 fw-semibold rounded-pill py-2 text-white"
                  style={{
                    background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                    border: 'none'
                  }}
                  onClick={async () => {
                    const id = 'DINE' + Math.random().toString(36).substr(2, 6).toUpperCase()
                    const total = parseFloat((getTotalPrice() * 1.05).toFixed(2))
                    const order = {
                      id,
                      status: 'Pending',
                      total,
                      paymentMethod: 'dine-in',
                      paymentLabel: 'Dine-In',
                      orderType: 'Dine-In',
                      createdAt: new Date().toISOString(),
                      items: cart.map(ci => ({ name: ci.name, quantity: ci.quantity, price: ci.price, spiceLevel: ci.spiceLevel }))
                    }

                    // Create order in backend
                    try {
                      const { API_BASE } = await import('../../utils/apiBase')
                      const { fetchJson } = await import('../../utils/fetchJson')
                      const orderPayload = {
                        restaurantId: 'default',
                        items: cart.map(ci => ({ name: ci.name, price: ci.price, quantity: ci.quantity, spiceLevel: ci.spiceLevel, subtotal: (ci.price * ci.quantity) })),
                        total,
                        paymentStatus: 'paid',
                        status: 'pending'
                      }
                      const { res, json } = await fetchJson(`${API_BASE}/api/orders`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderPayload)
                      })
                      if (res.ok && json && json.order) {
                        const serverId = json.order._id || json.order.id
                        order.id = serverId || id
                        order.serverId = serverId
                      }
                    } catch (err) {
                      console.warn('Failed to create order in backend:', err)
                    }

                    // Save locally
                    try {
                      const existing = JSON.parse(localStorage.getItem('orders') || '[]')
                      existing.push(order)
                      localStorage.setItem('orders', JSON.stringify(existing))
                    } catch (e) {
                      localStorage.setItem('orders', JSON.stringify([order]))
                    }
                    
                    // Save receipt
                    const receipt = {
                      id: `RCP-${order.id.slice(-8)}`,
                      orderId: order.serverId || order.id,
                      items: cart.map(ci => ({ name: ci.name, quantity: ci.quantity, price: ci.price, spiceLevel: ci.spiceLevel })),
                      subtotal: getTotalPrice(),
                      tax: getTotalPrice() * 0.05,
                      total: total,
                      paymentMethod: 'dine-in',
                      orderType: 'Dine-In',
                      createdAt: order.createdAt,
                      status: 'Pending'
                    }
                    try {
                      const receiptsStored = JSON.parse(localStorage.getItem('receipts') || '[]')
                      receiptsStored.push(receipt)
                      localStorage.setItem('receipts', JSON.stringify(receiptsStored))
                    } catch (e) {
                      console.warn('Failed to save receipt:', e)
                    }
                    
                    sessionStorage.setItem('paymentCompleted', 'true')
                    sessionStorage.setItem('paymentMethod', 'dine-in')
                    sessionStorage.setItem('orderType', 'Dine-In')
                    sessionStorage.setItem('lastOrderId', order.id)
                    sessionStorage.setItem('orderTotal', String(order.total))
                    clearCart()
                    navigate('/order-tracking')
                  }}
                >
                  Confirm Order
                </button>
              ) : (
                <Link
                  to="/payment"
                  className={`btn w-100 mb-2 fw-semibold rounded-pill py-2 text-decoration-none text-white ${
                    orderType ? 'btn-primary' : 'btn-secondary'
                  }`}
                  style={{
                    background: orderType
                      ? 'linear-gradient(90deg, #FF6A00, #FF9900)'
                      : '#6c757d',
                    border: 'none',
                    transition: 'all 0.3s ease-in-out',
                    opacity: orderType ? 1 : 0.6,
                    transform: orderType ? 'scale(1)' : 'scale(0.98)'
                  }}
                  onClick={(e) => {
                    if (!orderType) e.preventDefault()
                    else {
                      sessionStorage.setItem('orderType', orderType === 'dine-in' ? 'Dine-In' : 'Takeaway')
                    }
                  }}
                >
                  Proceed to Payment
                </Link>
              )}
 
              <button
                className="btn btn-outline-danger w-100 fw-semibold rounded-pill py-2"
                onClick={clearCart}
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
 
export default Cart