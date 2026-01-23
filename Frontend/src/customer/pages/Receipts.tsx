import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaDownload, FaFileInvoice, FaArrowLeft } from 'react-icons/fa'
import { API_BASE } from '../../utils/apiBase'
import { fetchJson } from '../../utils/fetchJson'

interface Receipt {
  id: string
  orderId: string
  customerName?: string
  items: Array<{
    name: string
    quantity: number
    price: number
    spiceLevel?: string
  }>
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  orderType: string
  createdAt: string
  status: string
}

const Receipts: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadReceipts = async () => {
      try {
        // Load from localStorage
        const localReceipts = JSON.parse(localStorage.getItem('receipts') || '[]')
        
        // Also fetch orders from backend and convert to receipts
        try {
          const { res, json } = await fetchJson(`${API_BASE}/api/orders`)
          if (res.ok && json && Array.isArray(json.orders)) {
            const backendReceipts: Receipt[] = json.orders
              .filter((o: any) => o.paymentStatus === 'paid')
              .map((o: any) => ({
                id: `RCP-${(o._id || o.id).toString().slice(-8)}`,
                orderId: o._id || o.id,
                customerName: (o.user && o.user.name) || (o.customerName) || 'Guest',
                items: o.items || [],
                subtotal: (o.total || 0) / 1.05, // Assuming 5% tax
                tax: (o.total || 0) * 0.05 / 1.05,
                total: o.total || 0,
                paymentMethod: o.paymentMethod || 'Unknown',
                orderType: o.orderType || 'Takeaway',
                createdAt: o.createdAt || new Date().toISOString(),
                status: o.status || 'Pending'
              }))

            // Merge with local receipts
            const allReceipts = [...backendReceipts, ...localReceipts]
              .filter((r, index, self) => 
                index === self.findIndex((t) => t.orderId === r.orderId)
              )
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

            setReceipts(allReceipts)
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('Failed to fetch orders from backend', err)
        }

        // Fallback to local only
        setReceipts(localReceipts.sort((a: Receipt, b: Receipt) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ))
        setLoading(false)
      } catch (e) {
        setReceipts([])
        setLoading(false)
      }
    }

    loadReceipts()
  }, [])

  const generateReceiptPDF = (receipt: Receipt) => {
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt.orderId}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
            body {
              font-family: 'Arial', sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .receipt-container {
              background: white;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #FF6A00;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #FF6A00;
              margin-bottom: 10px;
            }
            .subtitle {
              color: #666;
              font-size: 14px;
            }
            .receipt-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .info-item {
              flex: 1;
            }
            .info-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .info-value {
              font-weight: bold;
              color: #333;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th {
              background: #FF6A00;
              color: white;
              padding: 12px;
              text-align: left;
              font-size: 14px;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #eee;
            }
            .items-table tr:last-child td {
              border-bottom: none;
            }
            .item-name {
              font-weight: 600;
              color: #333;
            }
            .item-details {
              font-size: 12px;
              color: #666;
              margin-top: 4px;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              margin-left: 8px;
            }
            .badge-spice {
              background: #fff3cd;
              color: #856404;
            }
            .totals {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 2px solid #eee;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 15px;
            }
            .total-row.final {
              font-size: 20px;
              font-weight: bold;
              color: #FF6A00;
              margin-top: 10px;
              padding-top: 15px;
              border-top: 2px solid #FF6A00;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #eee;
              color: #666;
              font-size: 12px;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 10px;
            }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-preparing { background: #d1ecf1; color: #0c5460; }
            .status-served { background: #d4edda; color: #155724; }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="logo">🍽️ Kavya Serve</div>
              <div class="subtitle">Restaurant Bill Receipt</div>
            </div>

            <div class="receipt-info">
              <div class="info-item">
                <div class="info-label">Receipt ID</div>
                <div class="info-value">${receipt.id}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Order ID</div>
                <div class="info-value">${receipt.orderId}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date & Time</div>
                <div class="info-value">${new Date(receipt.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${receipt.items.map(item => `
                  <tr>
                    <td>
                      <div class="item-name">${item.name}</div>
                      ${item.spiceLevel ? `<div class="item-details"><span class="badge badge-spice">${item.spiceLevel}</span></div>` : ''}
                    </td>
                    <td>${item.quantity}</td>
                    <td style="text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>₹${receipt.subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Tax (5%):</span>
                <span>₹${receipt.tax.toFixed(2)}</span>
              </div>
              <div class="total-row final">
                <span>Total Amount:</span>
                <span>₹${receipt.total.toFixed(2)}</span>
              </div>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <div class="info-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #666;">Payment Method:</span>
                <span style="font-weight: 600;">${receipt.paymentMethod}</span>
              </div>
              <div class="info-row" style="display: flex; justify-content: space-between;">
                <span style="color: #666;">Order Type:</span>
                <span style="font-weight: 600;">${receipt.orderType}</span>
              </div>
              <div style="text-align: center; margin-top: 15px;">
                <span class="status-badge status-${receipt.status.toLowerCase()}">${receipt.status}</span>
              </div>
            </div>

            <div class="footer">
              <div>Thank you for dining with us!</div>
              <div style="margin-top: 8px;">Visit us again soon</div>
              <div style="margin-top: 15px; font-size: 10px; color: #999;">
                This is a computer-generated receipt
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(receiptHTML)
      printWindow.document.close()
      printWindow.focus()
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  const downloadReceipt = (receipt: Receipt) => {
    generateReceiptPDF(receipt)
  }

  if (loading) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading receipts...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10">
          {/* Header */}
          <div className="d-flex align-items-center mb-4">
            <Link
              to="/category"
              className="btn btn-outline-secondary me-3 rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: '40px', height: '40px' }}
            >
              <FaArrowLeft />
            </Link>
            <div>
              <h2 className="fw-bold mb-1" style={{
                background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                <FaFileInvoice className="me-2" />
                My Receipts
              </h2>
              <p className="text-muted mb-0">View and download your order receipts</p>
            </div>
          </div>

          {/* Receipts List */}
          {receipts.length === 0 ? (
            <div className="card shadow-sm border-0 text-center py-5">
              <FaFileInvoice className="text-muted mb-3" size={64} />
              <h5 className="text-muted">No receipts found</h5>
              <p className="text-muted">Your order receipts will appear here after you place orders.</p>
              <Link to="/category" className="btn btn-primary mt-3">
                Browse Menu
              </Link>
            </div>
          ) : (
            <div className="row g-4">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="col-12 col-md-6">
                  <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '12px', transition: 'transform 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h5 className="fw-bold mb-1">Receipt #{receipt.id.slice(-8)}</h5>
                          <small className="text-muted">
                            {new Date(receipt.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </small>
                        </div>
                        <span className={`badge ${
                          receipt.status === 'Served' ? 'bg-success' :
                          receipt.status === 'Preparing' ? 'bg-info' :
                          'bg-warning text-dark'
                        }`}>
                          {receipt.status}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Items:</span>
                          <span className="fw-semibold">{receipt.items.length} item(s)</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Order Type:</span>
                          <span className="fw-semibold">{receipt.orderType}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Payment:</span>
                          <span className="fw-semibold">{receipt.paymentMethod}</span>
                        </div>
                      </div>

                      <div className="border-top pt-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span className="fw-bold fs-5">Total:</span>
                          <span className="fw-bold fs-5" style={{ color: '#FF6A00' }}>
                            ₹{receipt.total.toFixed(2)}
                          </span>
                        </div>
                        <button
                          className="btn w-100 d-flex align-items-center justify-content-center gap-2"
                          style={{
                            background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px'
                          }}
                          onClick={() => downloadReceipt(receipt)}
                        >
                          <FaDownload />
                          Download Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Receipts
