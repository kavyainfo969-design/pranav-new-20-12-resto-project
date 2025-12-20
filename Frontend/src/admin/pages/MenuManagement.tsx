import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { menuItems as defaultMenuItems } from "../../data/menuItems";
import type { MenuItem } from "../../context/CartContext";

import { useAuth } from "../../context/AuthContext";

import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import AdminLayout from "../components/AdminLayout";

const MenuManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, authFetch } = useAuth();

  // FIXED: real authentication check
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin");
    }
  }, [user, navigate]);

  // Load menu items (local + server fallback)
  const [localMenuItems, setLocalMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem("adminMenu");
    return saved ? JSON.parse(saved) : defaultMenuItems;
  });

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const placeholderImage = "/assets/images/no-dishes.png";
  const tableTopRef = useRef<HTMLDivElement | null>(null);

  type FormDataType = {
    name: string;
    price: string;
    category: string;
    image: string;
    description: string;
    type: "veg" | "nonveg";
    spiceLevel: "mild" | "medium" | "hot";
  };

  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    price: "",
    category: "Starters",
    image: "",
    description: "",
    type: "veg",
    spiceLevel: "mild",
  });

  const categories = ["Starters", "Main Course", "Desserts", "Beverages"];

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch from backend (with fallback)
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/menu");
        if (!res.ok) throw new Error("Failed to fetch menu");
        const data = await res.json();

        const items = data.items || data;

        if (Array.isArray(items)) {
          setLocalMenuItems(
            items.map((it: any, idx: number) => ({
              id: it._id || it.id || idx + 1,
              name: it.name,
              price: Number(it.price || 0),
              category: it.category || "Starters",
              image: it.image || "",
              description: it.description || "",
              type: it.type || "veg",
              spiceLevel: it.spiceLevel || "mild",
            }))
          );
        }
      } catch (error) {
        // fallback to local only
      }
    })();
  }, [authFetch]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("adminMenu", JSON.stringify(localMenuItems));
  }, [localMenuItems]);

  // Handle form changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError(null);
  };

  const validateForm = () => {
    const errors: string[] = [];
    const name = formData.name.trim();
    if (!name || !/[A-Za-z0-9]/.test(name)) {
      errors.push("Name must include letters or numbers (no special characters only).");
    }

    if (!formData.description.trim()) {
      errors.push("Description is required.");
    }

    if (!formData.image.trim()) {
      errors.push("Image URL is required.");
    } else {
      try {
        new URL(formData.image);
      } catch {
        errors.push("Image URL format looks invalid.");
      }
    }

    const priceNumber = Number(formData.price);
    if (!formData.price.trim()) {
      errors.push("Price is required.");
    } else if (/^0\d+/.test(formData.price.trim())) {
      errors.push("Price cannot start with 0.");
    } else if (isNaN(priceNumber) || priceNumber <= 0) {
      errors.push("Price must be greater than zero.");
    }

    return errors;
  };

  // Add / Update Item
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length) {
      setFormError(errors.join(" "));
      return;
    }

    (async () => {
      try {
        const priceNumber = Number(formData.price);
        if (isNaN(priceNumber) || priceNumber <= 0) {
          throw new Error("Invalid price");
        }

        if (editingItem) {
          // UPDATE ITEM — server attempt
          const res = await authFetch(`/api/menu/${editingItem.id}`, {
            method: "PUT",
            body: JSON.stringify({ ...formData, price: priceNumber }),
          });

          if (!res.ok) throw new Error("Update failed");

          setLocalMenuItems((prev) =>
            prev.map((item) =>
              item.id === editingItem.id
                ? { ...item, ...formData, price: priceNumber }
                : item
            )
          );

          alert("✅ Item updated!");
          setIsEditModalOpen(false);
        } else {
          // CREATE ITEM — server attempt
          const res = await authFetch("/api/menu", {
            method: "POST",
            body: JSON.stringify({ ...formData, price: priceNumber }),
          });

          if (!res.ok) throw new Error("Create failed");

          const newItem: MenuItem = {
            ...formData,
            price: priceNumber,
            id: Math.max(0, ...localMenuItems.map((i) => i.id)) + 1,
          };

          setLocalMenuItems((prev) => [...prev, newItem]);

          alert("✅ Item added!");
        }
      } catch {
        // Offline fallback mode
        if (editingItem) {
          setLocalMenuItems((prev) =>
            prev.map((item) =>
              item.id === editingItem.id ? { ...item, ...formData } : item
            )
          );
          alert("⚠ Updated locally (server offline)");
          setIsEditModalOpen(false);
        } else {
          const newItem: MenuItem = {
            ...formData,
            price: priceNumber,
            id: Math.max(0, ...localMenuItems.map((i) => i.id)) + 1,
          };
          setLocalMenuItems((prev) => [...prev, newItem]);
          alert("⚠ Added locally (server offline)");
        }
      }

      resetForm();
    })();
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Delete this item?")) return;

    (async () => {
      try {
        const res = await authFetch(`/api/menu/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");

        setLocalMenuItems((prev) => prev.filter((i) => i.id !== id));
        alert("🗑️ Deleted!");
      } catch {
        setLocalMenuItems((prev) => prev.filter((i) => i.id !== id));
        alert("🗑️ Deleted locally (server offline)");
      }
    })();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      category: "Starters",
      image: "",
      description: "",
      type: "veg",
      spiceLevel: "mild",
    });
    setEditingItem(null);
    setShowAddForm(false);
    setIsEditModalOpen(false);
    setFormError(null);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: String(item.price),
      category: item.category,
      image: item.image,
      description: item.description,
      type: item.type,
      spiceLevel: item.spiceLevel,
    });
    setShowAddForm(false);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
    setFormError(null);
  };

  const toggleExpand = (id: number) => {
    if (isMobile) {
      setExpandedId((prev) => (prev === id ? null : id));
    }
  };

  const filteredItems = useMemo(() => {
    const text = searchQuery.toLowerCase();
    return localMenuItems.filter((item) => {
      const matchesText =
        item.name.toLowerCase().includes(text) ||
        item.description.toLowerCase().includes(text);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesText && matchesCategory;
    });
  }, [categoryFilter, localMenuItems, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [currentPage, filteredItems, pageSize]);

  const displayStart = filteredItems.length ? (currentPage - 1) * pageSize + 1 : 0;
  const displayEnd = filteredItems.length
    ? Math.min(currentPage * pageSize, filteredItems.length)
    : 0;

  const goToPage = (page: number) => {
    setCurrentPage(page);

    // Scroll the admin content area back to the top when pagination changes
    const mainEl = document.querySelector(".admin-main") as HTMLElement | null;
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <AdminLayout title="Menu Management">
      <div
        className="menu-management-container"
        style={{ backgroundColor: "#f8f9fa", padding: "20px", minHeight: "100vh" }}
      >
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap" ref={tableTopRef}>
          <h1 className="display-6 fw-bold text-primary mb-2">
            Menu Management
          </h1>

          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingItem(null);
              setIsEditModalOpen(false);
              setFormData({
                name: "",
                price: "",
                category: "Starters",
                image: "",
                description: "",
                type: "veg",
                spiceLevel: "mild",
              });
              setFormError(null);
              setShowAddForm(true);
            }}
          >
            <FaPlus className="me-2" /> Add New Item
          </button>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="card shadow-sm mb-4">
          <div className="card-body d-flex flex-wrap gap-3 align-items-center">
            <input
              type="search"
              className="form-control"
              placeholder="Search by name or description"
              style={{ minWidth: "220px" }}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            <select
              className="form-select"
              style={{ width: "200px" }}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: "160px" }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ADD / EDIT FORM */}
        {showAddForm && (
          <div
            className="card shadow-sm mb-4"
            style={{
              borderRadius: "12px",
              overflow: "hidden",
              maxWidth: "900px",
              margin: "auto",
            }}
          >
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
              </h5>
            </div>

            <div className="card-body">
              {formError && (
                <div className="alert alert-danger" role="alert">
                  {formError}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Price (₹)</label>
                    <input
                      type="number"
                      name="price"
                      className="form-control"
                      value={formData.price}
                      min={1}
                      step="0.01"
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Category</label>
                    <select
                      name="category"
                      className="form-select"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Image URL</label>
                    <input
                      type="url"
                      name="image"
                      className="form-control"
                      value={formData.image}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      className="form-control"
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-12 text-end">
                    <button type="submit" className="btn btn-primary me-2">
                      {editingItem ? "Update" : "Add Item"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ITEMS TABLE */}
        <div className="table-responsive">
          <table className="table align-middle shadow-sm bg-white rounded">
            <thead className="table-light">
              <tr>
                <th>Image</th>
                <th>Name & Category</th>
                <th>Description</th>
                <th>Price</th>
                <th style={{ width: "140px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pagedItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => toggleExpand(item.id)}
                  style={{ cursor: isMobile ? "pointer" : "default" }}
                >
                  <td>
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = placeholderImage;
                      }}
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "8px",
                        objectFit: "cover",
                      }}
                    />
                  </td>

                  <td>
                    <strong>{item.name}</strong>
                    <br />
                    <small className="text-muted">{item.category}</small>
                  </td>

                  <td className="text-muted">
                    {isMobile && expandedId !== item.id
                      ? item.description.slice(0, 25) + "..."
                      : item.description}
                  </td>

                  <td className="fw-bold text-primary">₹{item.price.toFixed(2)}</td>

                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                    >
                      <FaEdit />
                    </button>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}

              {pagedItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No menu items available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <div className="text-muted">
            Showing {displayStart}-{displayEnd} of {filteredItems.length}
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={currentPage === 1}
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
            >
              Previous
            </button>
            <div className="d-flex gap-1">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  className={`btn btn-sm ${page === currentPage ? "btn-primary" : "btn-light"}`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            >
              Next
            </button>
          </div>
        </div>

        {/* MOBILE STYLE */}
        <style>
          {`
          @media (max-width: 768px) {
            table thead {
              display: none;
            }
            table, table tbody, table tr, table td {
              display: block;
              width: 100%;
            }
            table tr {
              margin-bottom: 1rem;
              background: white;
              border-radius: 12px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            table td {
              padding: 10px 15px;
              border: none;
            }
            table td img {
              width: 100%;
              height: 150px;
              object-fit: cover;
              border-radius: 12px 12px 0 0;
            }
          }
        `}
        </style>

        {/* EDIT MODAL */}
        {isEditModalOpen && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ background: "rgba(0,0,0,0.45)", zIndex: 3000 }}
            onClick={closeEditModal}
          >
            <div
              className="card shadow-lg"
              style={{ width: "640px", maxWidth: "90%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Edit Menu Item</h5>
                <button
                  className="btn btn-sm btn-light"
                  onClick={closeEditModal}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="card-body">
                {formError && (
                  <div className="alert alert-danger" role="alert">
                    {formError}
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Price (₹)</label>
                      <input
                        type="number"
                        name="price"
                        className="form-control"
                        value={formData.price}
                        min={1}
                        step="0.01"
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Category</label>
                      <select
                        name="category"
                        className="form-select"
                        value={formData.category}
                        onChange={handleInputChange}
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Image URL</label>
                      <input
                        type="url"
                        name="image"
                        className="form-control"
                        value={formData.image}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea
                        name="description"
                        className="form-control"
                        rows={3}
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Update Item
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default MenuManagement;
