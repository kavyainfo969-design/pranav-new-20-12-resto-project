import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaTachometerAlt,
  FaUtensils,
  FaChartLine,
  FaFileAlt,
  FaSignOutAlt,
  FaCalendarAlt,
  FaCreditCard,
  FaFileInvoice,
  FaBuilding,
} from "react-icons/fa";
import "./AdminSidebar.css";
import { useAuth } from "../../context/AuthContext";

interface AdminSidebarProps {
  onToggle?: (collapsed: boolean) => void;
  isOpen?: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ onToggle, isOpen = false }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle resizing
  useEffect(() => {
    const resizeHandler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, []);

  // Sidebar toggle
  const toggleSidebar = () => {
    if (isMobile) onToggle?.(!isOpen);
    else {
      const newState = !collapsed;
      setCollapsed(newState);
      onToggle?.(newState);
    }
  };

  const handleLinkClick = () => {
    if (isMobile) onToggle?.(false);
  };

  // FIXED HASH NAVIGATION
  const isActive = (path: string) => {
    const [urlPath, hash] = path.split("#");

    if (location.pathname !== urlPath) return false;
    if (hash) return location.hash === `#${hash}`;
    return true;
  };

  const handleHashClick = (section: string, fullPath: string) => {
    navigate(fullPath);
    if (isMobile) onToggle?.(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/admin-panel");
  };

  const menuItems =
    user?.role === "superadmin"
      ? [
          { path: "/admin/super-dashboard#dashboard", icon: <FaTachometerAlt />, text: "Dashboard" },
          { path: "/admin/super-dashboard#restaurants", icon: <FaBuilding />, text: "Restaurants" },
          { path: "/admin/super-dashboard#subscriptions", icon: <FaCalendarAlt />, text: "Subscriptions" },
          { path: "/admin/super-dashboard#payments", icon: <FaCreditCard />, text: "Payments" },
          { path: "/admin/super-dashboard#invoices", icon: <FaFileInvoice />, text: "Invoices" },
          { path: "/admin/super-dashboard#analytics", icon: <FaChartLine />, text: "Analytics" },
          { path: "/", icon: <FaUtensils />, text: "Customer Menu" },
        ]
      : [
          { path: "/admin/dashboard", icon: <FaTachometerAlt />, text: "Dashboard" },
          { path: "/admin/menu", icon: <FaUtensils />, text: "Menu Management" },
          { path: "/admin/analytics", icon: <FaChartLine />, text: "Sales Analytics" },
          { path: "/admin/reports", icon: <FaFileAlt />, text: "Reports" },
        ];

  return (
    <>
      <div
        className={`admin-sidebar ${collapsed ? "collapsed" : ""} ${isMobile && isOpen ? "open" : ""}`}
        style={{
          background: "linear-gradient(180deg, #fff8e1, #ffe082)",
          boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div className="sidebar-header d-flex justify-content-between align-items-center px-3 py-3 border-bottom">
          {!collapsed && (
            <h5 className="mb-0 fw-bold" style={{ color: "#8d6e63" }}>
              🍽️ {user?.role === "superadmin" ? "Super Admin" : "Admin"}
            </h5>
          )}
          {!isMobile && (
            <button className="sidebar-toggle-btn btn btn-link" onClick={toggleSidebar}>
              <FaBars />
            </button>
          )}
        </div>

        {/* Menu */}
        <ul className="sidebar-menu list-unstyled mt-3 px-2">
          {menuItems.map((item) => {
            const isHash = item.path.includes("#");
            const [urlPath, hash] = item.path.split("#");

            return (
              <li key={item.path}>
                {isHash ? (
                  <button
                    onClick={() => handleHashClick(hash, item.path)}
                    className={`sidebar-link w-100 ${isActive(item.path) ? "active" : ""}`}
                  >
                    <span className="me-3">{item.icon}</span>
                    {!collapsed && item.text}
                  </button>
                ) : (
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`sidebar-link d-flex align-items-center ${isActive(item.path) ? "active" : ""}`}
                  >
                    <span className="me-3">{item.icon}</span>
                    {!collapsed && item.text}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {/* Footer spacer to keep layout consistent without logout button */}
        <div className="sidebar-footer mt-auto p-3 border-top" aria-hidden="true"></div>
      </div>

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => onToggle?.(false)}
          style={{
            position: "fixed",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            background: "rgba(0,0,0,0.5)",
          }}
        />
      )}
    </>
  );
};

export default AdminSidebar;
