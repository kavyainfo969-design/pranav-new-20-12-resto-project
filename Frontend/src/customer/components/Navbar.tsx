import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaShoppingCart, FaUtensils, FaMoon, FaSun, FaFileInvoice } from 'react-icons/fa'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
// import {lg} from 'Logo.png';
 
const Navbar: React.FC = () => {
  const { getTotalItems, cartAnimation } = useCart()
  const location = useLocation()
  // Normalize SPA path to support HashRouter (hash like "#/admin/kitchen") and
  // HistoryRouter (pathname). This mirrors the logic in App.tsx so route checks
  // behave consistently both locally and in deployed hash-mode.
  const spaPath = (() => {
    if (location.hash && location.hash.length > 0) {
      return location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
    }
    return location.pathname || '/'
  })()
  const isAdminRoute = spaPath.startsWith('/admin') || spaPath.startsWith('/admin-panel')
  let auth = null
  try {
    auth = useAuth()
  } catch (e) {
    auth = null
  }

  // Global theme toggle (dark/light) - persisted to localStorage
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
      if (saved) return saved === 'dark'
      return (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) || false
    } catch (e) {
      return false
    }
  })

  useEffect(() => {
    try {
      const root = document.documentElement
      const body = document.body
      if (darkMode) {
        root.classList.add('dark-mode')
        body.classList.add('dark-mode')
      } else {
        root.classList.remove('dark-mode')
        body.classList.remove('dark-mode')
      }
      localStorage.setItem('theme', darkMode ? 'dark' : 'light')
    } catch (e) {}
  }, [darkMode])

  // Logo swap: prefer a dark-mode logo asset when darkMode is active.
  const logoDefault = '/assets/images/Logo.png'
  const logoDark = '/assets/images/Logo-dark.png'
  const [logoSrc, setLogoSrc] = useState<string>(logoDefault)

  useEffect(() => {
    try {
      setLogoSrc(darkMode ? logoDark : logoDefault)
    } catch (e) {}
  }, [darkMode])

  // Consider user authenticated if context has a user OR token exists in localStorage
  const tokenFromStorage = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null
  const isLoggedIn = Boolean((auth && auth.user) || tokenFromStorage)
 
  if (isAdminRoute) {
    return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
        <div className="container">
          <Link className="navbar-brand" to="/admin/dashboard">
            <FaUtensils className="me-2" />
            Restaurant Admin
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/menu">Menu Management</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/analytics">Analytics</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/admin/reports">Reports</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    )
  }
 
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-lg py-0 position-sticky top-0" style={{ zIndex: 1000, backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
      <div className="container d-flex justify-content-between align-items-center position-relative">
       
        {/* 🍴 Brand (logo left) */}
        <Link className="navbar-brand fw-bold text-success fs-4 d-flex align-items-center" to="/">
          <img
            src={logoSrc}
            alt="Logo"
            className="me-2 logo"
            style={{ width: '200px', height: '70px', objectFit: 'cover' }}
            onError={(e) => {
              // If the dark logo asset isn't present, fall back to the default logo
              // and apply a CSS filter to improve contrast in dark mode.
              const img = e.currentTarget as HTMLImageElement
              if ((img.dataset || (img as any).__fallback)) return
              try {
                ;(img as any).__fallback = true
                img.src = logoDefault
                img.classList.add('logo-dark-filter')
              } catch (err) {}
            }}
          />
          {/* <span className="text-primary">RestoM</span> */}
        </Link>
 
        {/* 🛒 Cart + Auth actions - aligned right */}
  <div className="d-none d-lg-flex align-items-center">
          <Link
            to="/cart"
            className={`position-relative text-dark nav-link ${cartAnimation ? 'cart-bounce' : ''}`}
            style={{
              transition: 'transform 0.2s',
              background: 'linear-gradient(90deg, #FFA500, #FF6B00)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'white'
            }}
          >
            <FaShoppingCart size={22} className="me-1" />
            {getTotalItems() > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-white text-dark fw-bold">
                {getTotalItems()}
              </span>
            )}
          </Link>

          {/* Theme toggle near cart */}
          <button
            className="btn btn-sm ms-2"
            onClick={() => setDarkMode(d => !d)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ borderRadius: 20, background: 'transparent', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>

          {/* 👋 Centered greeting for md+ screens */}
          {isLoggedIn && (
            <div
              className="d-none d-md-flex align-items-center navbar-greeting-center text-secondary small"
              style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}
            >
              {(() => {
                try {
                  const n = (auth && auth.user && auth.user.name) || (typeof window !== 'undefined' && (localStorage.getItem('auth_user') || localStorage.getItem('user')) ? JSON.parse(localStorage.getItem('auth_user') || localStorage.getItem('user') || '{}').name : null)
                  if (!n) return null
                  const first = (n + '').split(' ')[0]
                  return <>Hi, <span className="fw-semibold text-dark ms-1">{first}</span></>
                } catch (e) { return null }
              })()}
            </div>
          )}

          {/* Auth action buttons inserted when user is logged in */}
          {isLoggedIn && (
            <div className="d-flex align-items-center ms-3 gap-2">
              <Link to="/receipts" className="btn btn-outline-primary">
                <FaFileInvoice className="me-1" />
                Receipts
              </Link>
              <Link to="/order-tracking" className="btn btn-outline-secondary">Track Order</Link>
              <button
                className="btn btn-outline-danger"
                onClick={() => {
                  try { auth && auth.logout() } catch (_) {}
                  // Clear legacy token keys
                  try { localStorage.removeItem('auth_token'); localStorage.removeItem('token'); localStorage.removeItem('auth_user'); } catch (e) {}
                  window.location.href = '/'
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
 
        {/* 📱 Mobile Cart (same design retained) */}
  <div className="d-lg-none d-flex align-items-center gap-2">
          {/* Removed Admin quick link and greeting for customer header */}
          <Link
            className={`nav-link position-relative text-white ${cartAnimation ? 'cart-bounce' : ''}`}
            to="/cart"
            style={{
              background: 'linear-gradient(90deg, #FFA500, #FF6B00)',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
          >
            <FaShoppingCart size={20} />
            {getTotalItems() > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-white text-dark fw-bold">
                {getTotalItems()}
              </span>
            )}
          </Link>
          {/* Mobile theme toggle */}
          <button
            className="btn btn-sm"
            onClick={() => setDarkMode(d => !d)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ borderRadius: 12, background: 'transparent', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          {isLoggedIn && (
            <>
              <Link to="/receipts" className="btn btn-sm btn-outline-primary me-2 d-inline-block d-lg-none">
                <FaFileInvoice />
              </Link>
              <Link to="/order-tracking" className="btn btn-sm btn-outline-secondary me-2 d-inline-block d-lg-none">Track</Link>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  try { auth && auth.logout() } catch (_) {}
                  try { localStorage.removeItem('auth_token'); localStorage.removeItem('token'); localStorage.removeItem('auth_user'); } catch (e) {}
                  window.location.href = '/'
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
 
export default Navbar