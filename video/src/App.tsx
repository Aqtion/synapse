import { useState, useEffect } from 'react'

export default function App() {
  const [popupOpen, setPopupOpen] = useState(true)
  const [currentPage, setCurrentPage] = useState('home')

  // Block escape key – popup doesn't close with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  // Popup re-opens after a delay (aggressive re-modal)
  useEffect(() => {
    if (!popupOpen) {
      const t = setTimeout(() => setPopupOpen(true), 8000)
      return () => clearTimeout(t)
    }
  }, [popupOpen])

  return (
    <div>
      {/* Terrible navigation: no landmarks, no semantics, divs not links/buttons */}
      <div style={{ padding: 8, background: '#ddd', display: 'flex', gap: 4 }}>
        <div
          onClick={() => setCurrentPage('home')}
          style={{ cursor: 'pointer', padding: 4 }}
        >
          Main
        </div>
        <div
          onClick={() => setCurrentPage('other')}
          style={{ cursor: 'pointer', padding: 4 }}
        >
          Close
        </div>
        <div
          onClick={() => setCurrentPage('home')}
          style={{ cursor: 'pointer', padding: 4 }}
        >
          Home
        </div>
        <div
          onClick={() => setCurrentPage('other')}
          style={{ cursor: 'pointer', padding: 4 }}
        >
          Skip
        </div>
      </div>

      {/* No heading hierarchy, low contrast */}
      <div style={{ padding: 24, color: '#888' }}>
        {currentPage === 'home' ? (
          <p>Welcome. You are on the main screen.</p>
        ) : (
          <p>This might be a different page. Or not.</p>
        )}
      </div>

      {/* POPUP: no role=dialog, no focus trap, overlay click does nothing */}
      {popupOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              background: '#fff',
              padding: 32,
              maxWidth: 400,
              position: 'relative',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>
              Important Notice
            </h2>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Please accept our cookies and sign up for our newsletter. This
              dialog cannot be dismissed by clicking outside or pressing Escape.
            </p>

            {/* Fake "Close" button – does nothing */}
            <button
              type="button"
              onClick={() => {}}
              style={{
                marginTop: 20,
                padding: '12px 24px',
                fontSize: 16,
                cursor: 'pointer',
                background: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
              }}
            >
              Close
            </button>

            {/* REAL CLOSE: 4×4px hitbox, bottom-left of modal, invisible, no aria-label */}
            <button
              type="button"
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                width: 4,
                height: 4,
                padding: 0,
                margin: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'default',
                overflow: 'hidden',
                fontSize: 0,
                lineHeight: 0,
              }}
              onClick={(e) => {
                e.stopPropagation()
                setPopupOpen(false)
              }}
            >
              {' '}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
