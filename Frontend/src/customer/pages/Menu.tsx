import React, { useState, useEffect } from 'react'
import { API_BASE } from '../../utils/apiBase'
import { fetchJson } from '../../utils/fetchJson'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { menuItems as localMenuItems } from '../../data/menuItems'
import { useCart } from '../../context/CartContext'
import type { MenuItem } from '../../context/CartContext'
import { FaPlus, FaMinus } from 'react-icons/fa'

const Menu: React.FC = () => {
  const { addToCart, cart, updateQuantity, updateSpiceLevel, isOnline } = useCart()
  const location = useLocation()
  const navigate = useNavigate()
  
  // 🟢 FIX 1: Initialize selectedCategory using a function that reads the URL immediately
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const urlParams = new URLSearchParams(location.search)
    const category = urlParams.get('category')
    return (category && category !== 'All Items') ? category : 'All'
  })
  
  // Initialize selectedType to 'all' as default if nothing is found
  const [selectedType, setSelectedType] = useState(
    localStorage.getItem('selectedType') || 'all'
  )
  // Normalized form of selectedType used in filters and URL sync
  const normalizedSelectedType = (selectedType || 'all').toLowerCase()
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    const urlParams = new URLSearchParams(location.search)
    return urlParams.get('search') || ''
  })
  const [selectedPrice, setSelectedPrice] = useState<string>('All Prices')
  const [selectedSpiceLevels, setSelectedSpiceLevels] = useState<{ [key: number]: 'mild' | 'medium' | 'hot' }>({})
  const [requestedItem, setRequestedItem] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(location.search)
    return urlParams.get('item') || null
  })

  // 🟢 FIX 2: Refactor useEffect. It is now only needed for selectedType logic 
  // or external state changes, but we'll keep the category logic just in case 
  // the URL changes later in the app's lifecycle (though initial load is fixed above).
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search)
    const category = urlParams.get('category')
    const typeFromUrl = urlParams.get('type')
    const itemFromUrl = urlParams.get('item')

    // Set category if provided (for subsequent location changes, not initial load)
    if (category && category !== 'All Items' && category !== selectedCategory) {
      setSelectedCategory(category)
    }

  // Update selected type state (default to 'all' so menu shows all items)
  const type = typeFromUrl || localStorage.getItem('selectedType') || 'all'
  setSelectedType(type)

    if (itemFromUrl) {
      const decodedItem = decodeURIComponent(itemFromUrl)
      setRequestedItem(decodedItem)
      setSearchQuery(decodedItem)
    }
  }, [location.search, selectedCategory])

  // Keep URL query params in sync with active filters so links/share work
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('category', selectedCategory || 'All')
    params.set('type', normalizedSelectedType || 'all')
    if (searchQuery) params.set('search', searchQuery)
    if (selectedPrice && selectedPrice !== 'All Prices') params.set('price', selectedPrice)
    if (requestedItem) params.set('item', requestedItem)

    // Only navigate (replace) when the computed search differs from current to
    // avoid unnecessary history updates or potential navigation loops.
    const newSearch = params.toString()
    const currentSearch = location.search.startsWith('?') ? location.search.slice(1) : location.search
    // Debug: log what's being compared before navigation
    console.debug('[Menu] URL sync check', {
      selectedCategory,
      normalizedSelectedType,
      selectedPrice,
      searchQuery,
      requestedItem,
      newSearch,
      currentSearch
    })
    if (newSearch !== currentSearch) {
      navigate({ search: newSearch }, { replace: true })
    }
  }, [selectedCategory, normalizedSelectedType, selectedPrice, searchQuery, requestedItem, navigate])

  // Debug: log filtered item counts when filters change so we can observe
  // whether filtering produced results or an unexpected empty state.
  useEffect(() => {
    try {
      // filteredItems is computed below; guard access in case of runtime ordering
      // by reading length via a small wrapper.
      const count = Array.isArray(filteredItems) ? filteredItems.length : -1
      console.debug('[Menu] Filters applied', {
        selectedCategory,
        normalizedSelectedType,
        selectedPrice,
        searchQuery,
        requestedItem,
        filteredCount: count
      })
    } catch (err) {
      console.error('[Menu] Error logging filteredItems', err)
    }
  }, [selectedCategory, normalizedSelectedType, selectedPrice, searchQuery, requestedItem])

  useEffect(() => {
    setSelectedSpiceLevels(prev => {
      let changed = false
      const updated = { ...prev }
      Object.keys(updated).forEach(key => {
        const id = Number(key)
        if (!cart.some(item => item.id === id)) {
          delete updated[id]
          changed = true
        }
      })
      return changed ? updated : prev
    })
  }, [cart])

  // Fetch items from backend on mount
  // Fetch backend items and merge with local items so we don't lose
  // items or images if the backend set is smaller or missing image URLs.
  const [backendItems, setBackendItems] = useState<MenuItem[] | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
  const { res, json } = await fetchJson(`${API_BASE}/api/menu`)
        if (!res.ok) {
          if (mounted) setBackendItems([])
        } else {
          const data = json || null
          if (mounted) {
            if (data && Array.isArray(data.items)) setBackendItems(data.items)
            else setBackendItems([])
          }
        }
      } catch (err) {
        if (mounted) setBackendItems(null)
      }
    })()
    return () => { mounted = false }
  }, [])

  const getActiveSpiceLevel = (itemId: number): 'mild' | 'medium' | 'hot' => {
    return (
      selectedSpiceLevels[itemId] ||
      (cart.find(cartItem => cartItem.id === itemId)?.spiceLevel ?? 'medium')
    )
  }

  // Merge backend items into local items safely. Rules:
  // - If backendItems is null (fetch error) or empty array, continue using localMenuItems
  // - If backendItems exists, prefer backend fields but use local image when backend image is empty
  const mergeItems = (local: MenuItem[], backend: MenuItem[] | null) => {
    if (!backend || backend.length === 0) return local
    const result: MenuItem[] = []
    const map = new Map<string, MenuItem>()

    const makeKey = (it: MenuItem) => (it.id != null ? String(it.id) : (it.name || '').toLowerCase())

    // Put backend items first (authoritative), but fix missing images using local
    backend.forEach(b => {
      const key = makeKey(b)
      const matchingLocal = local.find(l => makeKey(l) === key)
      const image = (b.image && b.image !== '') ? b.image : (matchingLocal ? matchingLocal.image : '/assets/images/no-dishes.png')
      map.set(key, { ...b, image })
    })

    // Add any local-only items that backend didn't include
    local.forEach(l => {
      const key = makeKey(l)
      if (!map.has(key)) map.set(key, l)
    })

    map.forEach(v => result.push(v))
    return result
  }

  const itemsSource = mergeItems(localMenuItems, backendItems)

  // Filter items based on category, type, price, search, and requested item

  const filteredItems = itemsSource.filter(item => {
    const matchCategory =
      selectedCategory === 'All' || item.category === selectedCategory

    const itemType = (item.type || '').toString()
    const normalizedItemType = itemType.toLowerCase().replace('-', '')
    const matchType =
      normalizedSelectedType === 'all'
        ? true
        : normalizedItemType === normalizedSelectedType.replace('-', '')

    const matchPrice = selectedPrice === 'All Prices' ||
      (selectedPrice === 'Under ₹200' && item.price < 200) ||
      (selectedPrice === '₹200–₹400' && item.price >= 200 && item.price <= 400) ||
      (selectedPrice === '₹400+' && item.price > 400)
      
  const itemName = (item.name || '').toString()
  const matchSearch = itemName.toLowerCase().includes((searchQuery || '').toLowerCase())
  const matchRequestedItem = !requestedItem || itemName.toLowerCase() === (requestedItem || '').toLowerCase()
    return matchCategory && matchType && matchPrice && matchSearch && matchRequestedItem
  })

  // Group items by category for display when 'All' is selected
  const sourceItems = itemsSource

  const groupedItems =
    selectedCategory === 'All'
      ? sourceItems.reduce((acc, item) => {
          if (!acc[item.category]) acc[item.category] = []
          acc[item.category].push(item)
          return acc
        }, {} as Record<string, MenuItem[]>)
      : {}

  const handleAddToCart = (item: MenuItem) => {
    const spiceLevel = getActiveSpiceLevel(item.id)
    addToCart(item, spiceLevel)
  }

  const handleSpiceLevelChange = (itemId: number, spiceLevel: 'mild' | 'medium' | 'hot') => {
    const currentSpice = getActiveSpiceLevel(itemId)
    setSelectedSpiceLevels(prev => ({
      ...prev,
      [itemId]: spiceLevel
    }))

    if (cart.some(cartItem => cartItem.id === itemId && cartItem.spiceLevel === currentSpice)) {
      updateSpiceLevel(itemId, currentSpice, spiceLevel)
    }
  }

  // Track cart changes to ensure real-time updates across pages
  // The cart from context automatically triggers re-renders, but we ensure
  // all cart-dependent calculations are fresh on each render

  const renderItem = (item: MenuItem) => {
    // Always get fresh cart state to ensure real-time updates when cart changes
    const activeSpice = getActiveSpiceLevel(item.id)
    // Find cart item matching both id and spice level for accurate quantity display
    const cartItem = cart.find(cartItem => 
      cartItem.id === item.id && cartItem.spiceLevel === activeSpice
    )
    const quantity = cartItem ? cartItem.quantity : 0

    return (
  <div key={String(item.id ?? item.name ?? '')} className="col-6 col-md-4 col-lg-3 menu-item-col">
        <div
          className="card border-0 shadow-sm position-relative menu-item-card"
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            transition: 'all 0.3s ease-in-out',
            background: 'white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-5px)'
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
          }}
        >
          {/* Image */}
          <div className="position-relative">
            <img
              src={item.image && item.image !== '' ? item.image : '/assets/images/no-dishes.png'}
              className="card-img-top"
              alt={item.name || 'Dish image'}
              loading="lazy"
              style={{
                display: 'block',
                height: '200px',
                minHeight: '120px',
                width: '100%',
                objectFit: 'cover',
                backgroundColor: '#f8f8f8'
              }}
              onError={(e) => {
                const target = e.currentTarget
                target.onerror = null
                target.src = '/assets/images/no-dishes.png'
              }}
            />
            <div className="position-absolute top-0 end-0 p-2">
              {item.type === 'veg' && <span className="badge bg-success">🥦 Veg</span>}
              {item.type === 'nonveg' && <span className="badge bg-danger">🍗 Non-Veg</span>}
            </div>
          </div>

          {/* Content */}
          <div className="card-body p-3" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, overflow: 'visible' }}>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h6 className="card-title fw-bold text-dark mb-0" style={{ fontSize: '16px', lineHeight: '1.3', flex: 1, marginRight: '8px' }}>
                {item.name}
              </h6>
              <div className="d-flex gap-1 flex-shrink-0">
                {(item.category === 'Starters' || item.category === 'Main Course') && (
                  <span
                    className={`badge ${
                      item.spiceLevel === 'hot'
                        ? 'bg-danger'
                        : item.spiceLevel === 'medium'
                        ? 'bg-warning'
                        : 'bg-success'
                    } text-white`}
                    style={{ fontSize: '10px' }}
                  >
                    {item.spiceLevel}
                  </span>
                )}
              </div>
            </div>

            <p className="card-text text-muted small mb-3" style={{ fontSize: '13px', lineHeight: '1.3', flexGrow: 1, marginBottom: '12px' }}>
              {item.description}
            </p>

            <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '8px' }}>
              <span
                className="fw-bold"
                style={{
                  fontSize: '16px',
                  background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  flexShrink: 0
                }}
              >
                ₹{item.price.toFixed(2)}
              </span>

              <div className="d-flex align-items-center gap-2 flex-wrap" style={{ flexShrink: 0, justifyContent: 'flex-end' }}>
                {(item.category === 'Starters' || item.category === 'Main Course') && (
                  <div className="d-flex gap-1">
                    {(['mild', 'medium', 'hot'] as const).map(spice => {
                      const isSelected = activeSpice === spice
                      return (
                      <button
                        key={spice}
                        className={`btn btn-xs rounded-pill px-2 py-1 ${
                          isSelected ? 'text-white' : 'btn-outline-secondary'
                        }`}
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          background:
                            isSelected
                              ? 'linear-gradient(90deg, #FF6A00, #FF9900)'
                              : undefined,
                          border: 'none',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onClick={() => handleSpiceLevelChange(item.id, spice)}
                        >
                          {spice.charAt(0).toUpperCase() + spice.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                )}

                {quantity > 0 && (
                  <div className="d-flex align-items-center">
                    <div
                      className="d-flex align-items-center rounded-pill px-2 py-1"
                      style={{
                        background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                        border: 'none',
                        minWidth: '90px',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(255, 106, 0, 0.3)',
                        zIndex: 10,
                        position: 'relative'
                      }}
                    >
                      <button
                        className="btn btn-xs fw-bold p-0 d-flex align-items-center justify-content-center"
                        style={{
                          backgroundColor: 'transparent',
                          color: 'white',
                          border: 'none',
                          width: '24px',
                          height: '24px',
                          fontSize: '14px',
                          cursor: isOnline ? 'pointer' : 'not-allowed'
                        }}
                        onClick={() => {
                          if (!isOnline) return
                          const spiceLevel = activeSpice
                          const cartItem = cart.find(ci => ci.id === item.id && ci.spiceLevel === spiceLevel)
                          if (cartItem) {
                            updateQuantity(cartItem.id, quantity - 1)
                          }
                        }}
                        tabIndex={0}
                        onFocus={(e) => e.currentTarget.style.outline = '2px solid #fff'}
                        onBlur={(e) => e.currentTarget.style.outline = 'none'}
                        disabled={!isOnline}
                      >
                        <FaMinus />
                      </button>
                      <span
                        className="fw-bold text-white"
                        style={{
                          fontSize: '15px',
                          minWidth: '25px',
                          textAlign: 'center'
                        }}
                      >
                        {quantity}
                      </span>
                      <button
                        className="btn btn-xs fw-bold p-0 d-flex align-items-center justify-content-center"
                        style={{
                          backgroundColor: 'transparent',
                          color: 'white',
                          border: 'none',
                          width: '24px',
                          height: '24px',
                          fontSize: '14px',
                          cursor: isOnline ? 'pointer' : 'not-allowed'
                        }}
                        onClick={() => isOnline && handleAddToCart(item)}
                        tabIndex={0}
                        onFocus={(e) => e.currentTarget.style.outline = '2px solid #fff'}
                        onBlur={(e) => e.currentTarget.style.outline = 'none'}
                        disabled={!isOnline}
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                )}

                {quantity === 0 && (
                  <button
                    className="btn rounded-pill fw-semibold d-flex align-items-center justify-content-center"
                    style={{
                      background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                      color: 'white',
                      border: 'none',
                      fontSize: '13px',
                      padding: '8px 18px',
                      minWidth: '85px',
                      boxShadow: '0 2px 8px rgba(255, 106, 0, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: isOnline ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      position: 'relative'
                    }}
                    onClick={() => isOnline && handleAddToCart(item)}
                    disabled={!isOnline}
                    onMouseEnter={(e) => {
                      if (isOnline) {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 106, 0, 0.4)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 106, 0, 0.3)'
                    }}
                  >
                    <FaPlus className="me-1" style={{ fontSize: '12px' }} />
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="container py-5"
      style={{
        background: 'linear-gradient(to bottom, #fffaf4, #fff3e0)',
        minHeight: '100vh'
      }}
    >
      <div className="row mb-3">
        <div className="col-12">
          <Link
            to="/category"
            className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: '40px', height: '40px' }}
          >
            ←
          </Link>
        </div>
      </div>
      <div className="row">
        <div className="col-12 text-center">
          {/* 🔍 Search Bar */}
          <div className="d-flex justify-content-center mb-4">
            <input
              type="text"
              className="form-control w-75 w-md-50"
              placeholder="Search for an item..."
              value={searchQuery}
              onChange={e => {
                const value = e.target.value
                setSearchQuery(value)
                if (!value) {
                  setRequestedItem(null)
                }
              }}
              style={{
                borderRadius: '50px',
                padding: '12px 20px',
                border: '2px solid #FF6A00',
                outline: 'none',
                maxWidth: '500px',
                background: 'white',
                color: '#333',
                boxShadow: '0 4px 15px rgba(255, 106, 0, 0.3)'
              }}
            />
          </div>

              {/* Filter Bar */}
          <div className="d-flex flex-column align-items-center mb-5 gap-3">
            <div
              className="d-flex gap-2 overflow-auto pb-2 px-2"
              style={{
                maxWidth: '100%',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <button
                type="button"
                className={`btn ${
                  selectedType === 'veg' ? 'text-white shadow-sm' : 'btn-outline-secondary'
                } px-3 py-2 px-md-4 py-md-2 rounded-pill fw-semibold d-flex align-items-center gap-2 flex-shrink-0`}
                onClick={() => setSelectedType('veg')}
                style={{
                  transition: 'all 0.2s ease',
                  background:
                    selectedType === 'veg'
                      ? 'linear-gradient(90deg, #28a745, #20c997)'
                      : undefined,
                  border: 'none',
                  whiteSpace: 'nowrap',
                  fontSize: '14px'
                }}
                disabled={!isOnline}
              >
                🥦 Veg
              </button>

              <button
                type="button"
                className={`btn ${
                  selectedType === 'nonveg' ? 'text-white shadow-sm' : 'btn-outline-secondary'
                } px-3 py-2 px-md-4 py-md-2 rounded-pill fw-semibold d-flex align-items-center gap-2 flex-shrink-0`}
                onClick={() => setSelectedType('nonveg')}
                style={{
                  transition: 'all 0.2s ease',
                  background:
                    selectedType === 'nonveg'
                      ? 'linear-gradient(90deg, #dc3545, #fd7e14)'
                      : undefined,
                  border: 'none',
                  whiteSpace: 'nowrap',
                  fontSize: '14px'
                }}
                disabled={!isOnline}
              >
                🍗 Non-Veg
              </button>
            </div>
            {/* Price Filter */}
            <div className="d-flex justify-content-center gap-1 gap-md-2 overflow-auto pb-2 px-2" style={{
              maxWidth: '100%',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}>
              {['All Prices', 'Under ₹200', '₹200–₹400', '₹400+'].map(price => (
                <button
                  key={price}
                  className={`btn rounded-pill px-2 px-md-4 py-2 fw-semibold flex-shrink-0 ${
                    selectedPrice === price ? 'text-white' : 'btn-outline-secondary'
                  }`}
                  style={selectedPrice === price ? {
                    background: 'linear-gradient(90deg, #FFA500, #FF6B00)',
                    border: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '12px'
                  } : { whiteSpace: 'nowrap', fontSize: '12px' }}
                  onClick={() => setSelectedPrice(price)}
                  disabled={!isOnline}
                >
                  {price}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🍽 Menu Items */}
      {selectedCategory === 'All' ? (
        Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="mb-5">
            <h3
              className="text-center mb-4 fw-bold"
              style={{
                background: 'linear-gradient(90deg, #FF6A00, #FF9900)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {category}
            </h3>
            {/* Mobile: Grid layout (2 columns), Desktop: 3 columns */}
            <div className="row g-2 g-md-3 g-lg-4 menu-grid">
              {items.map(item => renderItem(item))}
            </div>
          </div>
        ))
      ) : (
        <div className="row g-2 g-md-3 g-lg-4 menu-grid">
          {filteredItems.map(item => renderItem(item))}
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-5">
          <div className="text-center p-4">
            <img src="/assets/images/no-dishes.png" alt="No dishes found" style={{ width: '230px' }} />
          </div>
        </div>
      )}

      {/* Mobile Grid Styles */}
      <style>{`
        @media (max-width: 768px) {
          .menu-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .menu-item-col {
            padding: 0 6px;
          }
          .menu-item-card {
            margin-bottom: 0;
            display: flex;
            flex-direction: column;
          }
          .menu-item-card .card-img-top {
            height: 140px !important;
            object-fit: cover;
          }
          .menu-item-card .card-body {
            padding: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            flex-grow: 1 !important;
          }
          .menu-item-card .card-title {
            font-size: 14px !important;
            line-height: 1.3;
            margin-bottom: 6px;
          }
          .menu-item-card .card-text {
            font-size: 11px !important;
            line-height: 1.2;
            margin-bottom: 8px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            flex-grow: 1;
          }
          .menu-item-card .btn {
            font-size: 12px !important;
            padding: 8px 14px !important;
            min-width: 75px !important;
            z-index: 10 !important;
            position: relative !important;
            box-shadow: 0 2px 6px rgba(255, 106, 0, 0.3) !important;
          }
          .menu-item-card .rounded-pill {
            min-width: 90px !important;
            padding: 6px 10px !important;
            z-index: 10 !important;
            position: relative !important;
            overflow: visible !important;
          }
          .menu-item-card {
            overflow: visible !important;
          }
          .menu-item-card .d-flex.align-items-center.gap-2 {
            flex-wrap: wrap !important;
            justify-content: flex-end !important;
            overflow: visible !important;
          }
          .menu-item-card .card-body > div:last-child {
            margin-top: auto !important;
            padding-top: 8px !important;
          }
        }
        @media (min-width: 769px) {
          .menu-grid {
            display: flex;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  )
}

export default Menu