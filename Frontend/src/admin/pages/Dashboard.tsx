import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { orders as localOrdersSample } from "../../data/orders";

import {
  FaShoppingCart,
  FaClock,
  FaCheckCircle,
  FaUtensils,
  FaRupeeSign,
} from "react-icons/fa";

import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../../context/AuthContext";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, authFetch } = useAuth();

  const [localOrders, setLocalOrders] = useState(localOrdersSample);

  // Poll backend for latest orders (every 5s) so admin dashboard shows new customer orders
  useEffect(() => {
    let mounted = true
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        if (mounted && data && Array.isArray(data.orders)) {
          // Map backend orders into the UI shape expected by the dashboard
          const backendMapped = data.orders.map((o: any) => ({
            id: o._id || o.id,
            customerName: (o.user && o.user.name) || (o.customerName) || 'Guest',
            customerEmail: (o.user && o.user.email) || (o.customerEmail) || '',
            items: o.items || [],
            total: o.total || 0,
            status: o.status ? (o.status.charAt(0).toUpperCase() + o.status.slice(1)) : 'Pending',
          }))

          // Merge backend results with local state to avoid overwriting admin-made 'Served' selections
          setLocalOrders(prev => {
            // build map of prev statuses
            const prevMap = new Map(prev.map((p: any) => [p.id, p]))
            // For each backend order, if admin previously marked it Served locally,
            // preserve that Served value so polling doesn't revert it back to Pending.
            const merged = backendMapped.map((b: any) => {
              const existing = prevMap.get(b.id)
              if (existing && existing.status === 'Served') {
                return { ...b, status: 'Served' }
              }
              return b
            })

            // Also include any local-only orders that backend didn't return yet (keep them at front)
            const backendIds = new Set(merged.map((m: any) => m.id))
            const localsNotInBackend = prev.filter((p: any) => !backendIds.has(p.id))
            return [...localsNotInBackend, ...merged]
          })
        }
      } catch (err) {
        // leave sample data if fetch fails
        console.warn('Failed to load orders from backend', err)
      }
    }

    fetchOrders()
    const id = setInterval(fetchOrders, 5000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  // FIXED: Authentication
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin");
    }
  }, [user, navigate]);

  const totalOrders = localOrders.length;
  const totalRevenue = localOrders.reduce((sum, o) => sum + o.total, 0);
  const activeOrders = localOrders.filter((o) => o.status !== "Served").length;
  const completedOrders = localOrders.filter((o) => o.status === "Served").length;

  const updateOrderStatus = (
    id: string,
    status: "Pending" | "Preparing" | "Served"
  ) => {
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );

    // Try to persist the status change to backend. If backend requires auth this
    // request may fail with 401 — we ignore errors but this ensures persistence
    // when running without auth middleware (or when proper auth is wired).
    ;(async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
        // Use authFetch so Authorization header is included when available
        await authFetch(`${apiUrl}/api/orders/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: status.toLowerCase() })
        })
      } catch (err) {
        // ignore — local state will still preserve Served because of merge logic
        console.warn('Failed to persist order status change', err)
      }
    })()
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-warning text-dark";
      case "Preparing":
        return "bg-info text-white";
      case "Served":
        return "bg-success text-white";
      default:
        return "bg-secondary";
    }
  };

  return (
    <AdminLayout title="Dashboard">
      <div
        className="container-fluid py-4"
        style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}
      >
        {/* HEADER */}
        <div className="mb-4">
          <h1 className="display-6 fw-bold text-primary">Admin Dashboard</h1>
        </div>

        {/* CARDS */}
        <div className="row g-4 mb-5">
          {[
            {
              icon: <FaShoppingCart />,
              label: "Total Orders",
              value: totalOrders,
              color: "#FF6B00",
              tooltip: "All orders received",
            },
            {
              icon: <FaRupeeSign />,
              label: "Revenue",
              value: `₹${totalRevenue.toFixed(2)}`,
              color: "#00B050",
              tooltip: "Total revenue from orders",
            },
            {
              icon: <FaClock />,
              label: "Active Orders",
              value: activeOrders,
              color: "#FF9500",
              tooltip: "Orders that are not yet served",
            },
            {
              icon: <FaCheckCircle />,
              label: "Completed",
              value: completedOrders,
              color: "#17A2B8",
              tooltip: "Orders marked as served",
            },
          ].map((card, i) => (
            <div className="col-6 col-md-3" key={i}>
              <div
                className="card shadow-sm border-0 h-100 text-center dashboard-card"
                title={card.tooltip}
                style={{
                  background: `linear-gradient(135deg, ${card.color}, ${card.color}cc)`,
                  color: "white",
                  borderRadius: "12px",
                }}
              >
                <div className="card-body">
                  <div className="fs-1 mb-3">{card.icon}</div>
                  <h3 className="fw-bold mb-1">{card.value}</h3>
                  <p className="mb-0">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ORDERS CARD */}
        <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "12px" }}>
          <div
            className="d-flex justify-content-between align-items-center mb-3"
            style={{ borderBottom: "2px solid #eee" }}
          >
            <h5 className="fw-semibold d-flex align-items-center">
              <FaUtensils className="me-2 text-warning" />
              Recent Orders
            </h5>
            <span className="badge bg-warning text-dark">{localOrders.length} orders</span>
          </div>

          {/* FIXED TABLE HEADER FOR DESKTOP */}
          <div className="d-none d-md-flex fw-bold px-3 mb-2 text-muted">
            <div className="col-md-2">Order ID</div>
            <div className="col-md-2">Customer</div>
            <div className="col-md-3">Items</div>
            <div className="col-md-1">Total</div>
            <div className="col-md-2">Status</div>
            <div className="col-md-2">Actions</div>
          </div>

          {/* DESKTOP VIEW */}
          <div className="d-none d-md-block">
            {localOrders.map((order) => (
              <div
                key={order.id}
                className="d-flex align-items-center justify-content-between p-3 mb-2 rounded"
                style={{
                  backgroundColor: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <div className="col-md-2 fw-bold">{order.id}</div>

                <div className="col-md-2">
                  <div className="fw-semibold">{order.customerName}</div>
                  <small className="text-muted">{order.customerEmail}</small>
                </div>

                <div className="col-md-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="small text-dark">
                      {item.name}{" "}
                      <span className="badge bg-light text-dark">x{item.quantity}</span>{" "}
                      {item.spiceLevel && (
                        <span className="badge bg-warning text-dark">{item.spiceLevel}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div
                  className="col-md-1 fw-bold"
                  style={{
                    background: "linear-gradient(90deg, #FFA500, #FF6B00)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  ₹{order.total.toFixed(2)}
                </div>

                <div className="col-md-2">
                  <span className={`badge ${getStatusBadgeClass(order.status)} px-3 py-2`}>
                    {order.status}
                  </span>
                </div>

                {/* FIXED: DISABLE IF SERVED */}
                <div className="col-md-2">
                  <select
                    disabled={order.status === "Served"}
                    className="form-select form-select-sm shadow-sm"
                    value={order.status}
                    onChange={(e) =>
                      updateOrderStatus(order.id, e.target.value as any)
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Served">Served</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* MOBILE VIEW */}
          <div className="d-md-none">
            {localOrders.map((order) => (
              <div
                key={order.id}
                className="p-3 mb-3 rounded shadow-sm bg-white"
                style={{ borderLeft: "5px solid orange" }}
              >
                <div className="fw-bold mb-1">{order.customerName}</div>
                <small className="text-muted">{order.customerEmail}</small>

                <div className="mt-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="small">
                      {item.name}{" "}
                      <span className="badge bg-light text-dark">x{item.quantity}</span>{" "}
                    </div>
                  ))}
                </div>

                <div className="d-flex justify-content-between mt-3">
                  <span className="fw-bold">₹{order.total.toFixed(2)}</span>
                  <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                {/* FIXED: DISABLE IF SERVED */}
                <select
                  disabled={order.status === "Served"}
                  className="form-select form-select-sm mt-2"
                  value={order.status}
                  onChange={(e) =>
                    updateOrderStatus(order.id, e.target.value as any)
                  }
                >
                  <option value="Pending">Pending</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Served">Served</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>
        {`
          .dashboard-card {
            position: relative;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .dashboard-card:hover {
            transform: translateY(-4px) scale(1.01);
            box-shadow: 0 12px 25px rgba(0,0,0,0.18);
          }
          .dashboard-card::after {
            content: attr(title);
            position: absolute;
            left: 50%;
            bottom: -36px;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 0.8rem;
            opacity: 0;
            pointer-events: none;
            white-space: nowrap;
            transition: opacity 0.15s ease, transform 0.15s ease;
          }
          .dashboard-card:hover::after {
            opacity: 1;
            transform: translate(-50%, -4px);
          }
        `}
      </style>
    </AdminLayout>
  );
};

export default Dashboard;
