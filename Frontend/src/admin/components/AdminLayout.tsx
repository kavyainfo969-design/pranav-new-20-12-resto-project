import React, { useState, useEffect } from "react";
import { FaBars, FaUserCircle, FaSignOutAlt, FaCog } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

import AdminSidebar from "./AdminSidebar";
import "./AdminLayout.css";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile open/close
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Track screen size
  useEffect(() => {
    const resizeHandler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, []);

  // Navbar toggle button
  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  // This function is passed to Sidebar → keeps both components in sync
  const handleSidebarToggleFromSidebar = (value: boolean) => {
    if (isMobile) {
      setSidebarOpen(value);
    } else {
      setSidebarCollapsed(value);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/admin"); // your login route
  };

  // Close profile menu on outside click
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest(".profile-menu-container")) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, []);

  // Convert our states into Sidebar "isOpen"
  // Desktop → collapsed means isOpen = !collapsed
  // Mobile  → isOpen = sidebarOpen
  const computedIsOpen = isMobile ? sidebarOpen : !sidebarCollapsed;

  return (
    <div className={`admin-layout ${sidebarCollapsed ? "collapsed" : ""}`}>
      {/* NAVBAR */}
      <nav
        className="admin-navbar navbar navbar-light bg-light"
        style={{
          background: "linear-gradient(90deg, #f8f9fa, #e9ecef)",
          position: "sticky",
          top: 0,
          zIndex: 1020,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <button
            className="btn btn-link text-dark d-lg-none"
            onClick={handleToggleSidebar}
            style={{ fontSize: "1.5rem" }}
          >
            ☰
          </button>

          <div className="flex-grow-1 text-center">
            {title && <h5 className="fw-semibold mb-0">{title}</h5>}
          </div>

          {/* Profile */}
          <div className="position-relative profile-menu-container">
            <button
              className="btn btn-link text-dark d-flex align-items-center gap-2"
              onClick={() => setShowProfileMenu((p) => !p)}
            >
              <FaUserCircle size={24} />
              <span className="d-none d-md-inline fw-semibold">Admin</span>
            </button>

            {showProfileMenu && (
              <div className="position-absolute bg-white shadow rounded profile-dropdown">
                <div className="p-3 border-bottom">
                  <div className="d-flex gap-2 align-items-center">
                    <FaUserCircle size={30} />
                    <div>
                      <div className="fw-semibold">Administrator</div>
                      <small className="text-muted">admin@restom.com</small>
                    </div>
                  </div>
                </div>

                <button
                  className="dropdown-item py-2"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/admin/profile");
                  }}
                >
                  Profile Settings
                </button>

                <div className="border-top">
                  <button
                    className="dropdown-item text-danger py-2"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* SIDEBAR */}
      <AdminSidebar
        isOpen={computedIsOpen}
        onToggle={handleSidebarToggleFromSidebar}
      />

      {/* MAIN CONTENT */}
      <main
        className={`admin-main ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      >
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;

