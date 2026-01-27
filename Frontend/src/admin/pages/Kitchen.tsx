import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUtensils,
  FaClock,
  FaCheckCircle,
  FaSpinner,
} from "react-icons/fa";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from '../../utils/apiBase'
import { fetchJson } from '../../utils/fetchJson'

type KitchenProps = {
  publicView?: boolean;
};

const Kitchen: React.FC<KitchenProps> = ({ publicView = false }) => {
  const navigate = useNavigate();
  const { user, authFetch } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication check (skip when rendering public kitchen view)
  useEffect(() => {
    if (publicView) return;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      navigate("/admin-panel");
    }
  }, [user, navigate, publicView]);

  // Fetch orders from backend (poll every 5 seconds)
  useEffect(() => {
    let mounted = true;
    const fetchOrders = async () => {
      try {
        const { res, json } = await fetchJson(`${API_BASE}/api/orders`);
        if (!res.ok) throw new Error('Failed to fetch orders');
        const data = json || null;
        if (mounted && data && Array.isArray(data.orders)) {
          // Map backend orders to UI format
          const mappedOrders = data.orders.map((o: any) => ({
            id: o._id || o.id,
            customerName: (o.user && o.user.name) || (o.customerName) || 'Guest',
            customerEmail: (o.user && o.user.email) || (o.customerEmail) || '',
            items: o.items || [],
            total: o.total || 0,
            status: o.status ? (o.status.charAt(0).toUpperCase() + o.status.slice(1)) : 'Pending',
            createdAt: o.createdAt || new Date().toISOString(),
            paymentStatus: o.paymentStatus || 'pending'
          }));

          // Show orders that are not failed (this includes pending and paid)
          // so the kitchen can begin preparing orders even before payment confirmation
          const visibleOrders = mappedOrders
            .filter((o: any) => o.paymentStatus !== 'failed')
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          setOrders(visibleOrders);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load orders from backend', err);
        setLoading(false);
      }
    };

    fetchOrders();
    const intervalId = setInterval(fetchOrders, 5000); // Poll every 5 seconds
    return () => { 
      mounted = false; 
      clearInterval(intervalId);
    };
  }, []);

  // SSE: subscribe to live order events (order-created, order-updated)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_BASE}/api/orders/stream`);
    } catch (e) {
      es = null;
    }

    const mapBackendOrder = (o: any) => ({
      id: o._id || o.id,
      customerName: (o.user && o.user.name) || (o.customerName) || 'Guest',
      customerEmail: (o.user && o.user.email) || (o.customerEmail) || '',
      items: o.items || [],
      total: o.total || 0,
      status: o.status ? (o.status.charAt(0).toUpperCase() + o.status.slice(1)) : 'Pending',
      createdAt: o.createdAt || new Date().toISOString(),
      paymentStatus: o.paymentStatus || 'pending'
    });

    const handleCreated = (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data);
        const o = mapBackendOrder(raw);
        // mark as new briefly so UI can highlight the arrival
        (o as any).isNew = true;
        // show orders that are not failed
        if (o.paymentStatus !== 'failed') {
          setOrders(prev => {
            if (prev.find(p => p.id === o.id)) return prev;
            const next = [o, ...prev];
            next.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            // remove isNew after a short delay
            setTimeout(() => {
              setOrders(cur => cur.map(c => c.id === o.id ? { ...c, isNew: false } : c));
            }, 6000);
            return next;
          });
        }
      } catch (err) { /* ignore parse errors */ }
    };

    const handleUpdated = (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data);
        const o = mapBackendOrder(raw);
        setOrders(prev => {
          const idx = prev.findIndex(p => p.id === o.id);
          if (idx === -1) {
            // if it became visible (not failed), add it
            if (o.paymentStatus !== 'failed') return [o, ...prev];
            return prev;
          }
          const copy = [...prev];
          // If paymentStatus changed to failed, remove
          if (o.paymentStatus === 'failed') {
            copy.splice(idx, 1);
            return copy;
          }
          // mark briefly as updated so kitchen can highlight status changes
          copy[idx] = { ...copy[idx], ...o, justUpdated: true };
          setTimeout(() => {
            setOrders(cur => cur.map(c => c.id === o.id ? { ...c, justUpdated: false } : c));
          }, 4000);
          // keep newest first
          copy.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return copy;
        });
      } catch (err) { /* ignore */ }
    };

    if (es) {
      es.addEventListener('order-created', handleCreated as any);
      es.addEventListener('order-updated', handleUpdated as any);
      es.addEventListener('error', () => {
        // SSE failed — close and rely on polling
        try { es && es.close(); } catch (e) {}
      });
    }

    return () => {
      try {
        if (es) {
          es.removeEventListener('order-created', handleCreated as any);
          es.removeEventListener('order-updated', handleUpdated as any);
          es.close();
        }
      } catch (e) {}
    };
  }, []);

  const updateOrderStatus = async (
    id: string,
    status: "Pending" | "Preparing" | "Served"
  ) => {
    // If this is the public kitchen view, do not allow status updates
    if (publicView) return;
    // Optimistically update UI
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );

    // Persist to backend
    try {
      const apiUrl = API_BASE;
      await authFetch(`${apiUrl}/api/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: status.toLowerCase() })
      });
    } catch (err) {
      console.warn('Failed to persist order status change', err);
      // Revert on error
      const { res, json } = await fetchJson(`${API_BASE}/api/orders`);
      if (res.ok && json && Array.isArray(json.orders)) {
        const mappedOrders = json.orders.map((o: any) => ({
          id: o._id || o.id,
          status: o.status ? (o.status.charAt(0).toUpperCase() + o.status.slice(1)) : 'Pending',
          // ... other fields
        }));
        setOrders((prev) => {
          const updated = prev.map((p) => {
            const backend = mappedOrders.find((b: any) => b.id === p.id);
            return backend ? { ...p, status: backend.status } : p;
          });
          return updated;
        });
      }
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <FaClock className="me-2" />;
      case "Preparing":
        return <FaSpinner className="me-2" />;
      case "Served":
        return <FaCheckCircle className="me-2" />;
      default:
        return null;
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "Pending");
  const preparingOrders = orders.filter((o) => o.status === "Preparing");
  const servedOrders = orders.filter((o) => o.status === "Served");

  if (loading) {
    return (
      <AdminLayout title="Kitchen Dashboard">
        <div className="container-fluid py-4 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Kitchen Dashboard">
      <div
        className="container-fluid py-4"
        style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}
      >
        {/* HEADER */}
        <div className="mb-4">
          <h1 className="display-6 fw-bold text-primary">
            <FaUtensils className="me-2" />
            Kitchen Dashboard
          </h1>
          <p className="text-muted">Manage order status and track kitchen operations</p>
        </div>

        {/* STATS CARDS */}
        <div className="row g-4 mb-5">
          {[
            {
              icon: <FaClock />,
              label: "Pending Orders",
              value: pendingOrders.length,
              color: "#FFC107",
            },
            {
              icon: <FaSpinner />,
              label: "Preparing",
              value: preparingOrders.length,
              color: "#17A2B8",
            },
            {
              icon: <FaCheckCircle />,
              label: "Served",
              value: servedOrders.length,
              color: "#28A745",
            },
            {
              icon: <FaUtensils />,
              label: "Total Orders",
              value: orders.length,
              color: "#FF6B00",
            },
          ].map((card, i) => (
            <div className="col-6 col-md-3" key={i}>
              <div
                className="card shadow-sm border-0 h-100 text-center"
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

        {/* ORDERS SECTION */}
        <div className="row g-4">
          {/* PENDING ORDERS */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0 fw-bold">
                  <FaClock className="me-2" />
                  Pending ({pendingOrders.length})
                </h5>
              </div>
              <div className="card-body" style={{ maxHeight: "600px", overflowY: "auto" }}>
                {pendingOrders.length === 0 ? (
                  <p className="text-muted text-center py-4">No pending orders</p>
                ) : (
                  pendingOrders.map((order, idx) => (
                    <div
                      key={order.id}
                      className="card mb-3 shadow-sm"
                      style={{ borderRadius: "8px", transition: 'box-shadow 0.3s ease', boxShadow: order.isNew ? '0 8px 30px rgba(255,165,0,0.25)' : undefined }}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="fw-bold mb-1">
                              <span className="badge bg-primary text-white me-2">#{idx + 1}</span>
                              Order #{order.id.slice(-6)}
                              {order.isNew && (
                                <span className="badge bg-danger text-white ms-2">New</span>
                              )}
                              {order.justUpdated && (
                                <span className="badge bg-info text-white ms-2">Updated</span>
                              )}
                            </h6>
                            <small className="text-muted">
                              {order.customerName}
                            </small>
                          </div>
                          <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="mb-2">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="small mb-1">
                              <span className="fw-semibold">{item.name}</span>
                              <span className="badge bg-light text-dark ms-2">
                                x{item.quantity}
                              </span>
                              {item.spiceLevel && (
                                <span className="badge bg-warning text-dark ms-1">
                                  {item.spiceLevel}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold text-primary">
                            ₹{order.total.toFixed(2)}
                          </span>
                          <small className="text-muted">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </small>
                        </div>

                        {!publicView ? (
                          <select
                            className="form-select form-select-sm"
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(order.id, e.target.value as any)
                            }
                          >
                            <option value="Pending">Pending</option>
                            <option value="Preparing">Preparing</option>
                            <option value="Served">Served</option>
                          </select>
                        ) : (
                          <div className="text-end small text-muted">Status: {order.status}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* PREPARING ORDERS */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
              <div className="card-header bg-info text-white">
                <h5 className="mb-0 fw-bold">
                  <FaSpinner className="me-2" />
                  Preparing ({preparingOrders.length})
                </h5>
              </div>
              <div className="card-body" style={{ maxHeight: "600px", overflowY: "auto" }}>
                {preparingOrders.length === 0 ? (
                  <p className="text-muted text-center py-4">No orders being prepared</p>
                ) : (
                  preparingOrders.map((order, idx) => (
                    <div
                      key={order.id}
                      className="card mb-3 shadow-sm"
                      style={{ borderRadius: "8px", transition: 'box-shadow 0.3s ease', boxShadow: order.justUpdated ? '0 8px 30px rgba(23,162,184,0.12)' : undefined }}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="fw-bold mb-1">
                              <span className="badge bg-primary text-white me-2">#{idx + 1}</span>
                              Order #{order.id.slice(-6)}
                              {order.justUpdated && (
                                <span className="badge bg-info text-white ms-2">Updated</span>
                              )}
                            </h6>
                            <small className="text-muted">
                              {order.customerName}
                            </small>
                          </div>
                          <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="mb-2">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="small mb-1">
                              <span className="fw-semibold">{item.name}</span>
                              <span className="badge bg-light text-dark ms-2">
                                x{item.quantity}
                              </span>
                              {item.spiceLevel && (
                                <span className="badge bg-warning text-dark ms-1">
                                  {item.spiceLevel}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold text-primary">
                            ₹{order.total.toFixed(2)}
                          </span>
                          <small className="text-muted">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </small>
                        </div>

                        <select
                          className="form-select form-select-sm"
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
                  ))
                )}
              </div>
            </div>
          </div>

          {/* SERVED ORDERS */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
              <div className="card-header bg-success text-white">
                <h5 className="mb-0 fw-bold">
                  <FaCheckCircle className="me-2" />
                  Served ({servedOrders.length})
                </h5>
              </div>
              <div className="card-body" style={{ maxHeight: "600px", overflowY: "auto" }}>
                {servedOrders.length === 0 ? (
                  <p className="text-muted text-center py-4">No served orders</p>
                ) : (
                  servedOrders.slice(0, 10).map((order) => (
                    <div
                      key={order.id}
                      className="card mb-3 shadow-sm"
                      style={{ borderRadius: "8px", opacity: 0.8 }}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="fw-bold mb-1">Order #{order.id.slice(-6)}</h6>
                            <small className="text-muted">
                              {order.customerName}
                            </small>
                          </div>
                          <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="mb-2">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="small mb-1">
                              <span className="fw-semibold">{item.name}</span>
                              <span className="badge bg-light text-dark ms-2">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold text-primary">
                            ₹{order.total.toFixed(2)}
                          </span>
                          <small className="text-muted">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Kitchen;
