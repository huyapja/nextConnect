import { useState, useEffect } from 'react'
import { FiPhone, FiPhoneCall, FiVideo } from 'react-icons/fi'
import { useTheme } from '@/ThemeProvider'
import { useGlobalStringee } from '../GlobalStringeeProvider'

interface CallButtonProps {
  onMakeCall: (isVideoCall: boolean) => void
  isGlobalCall?: boolean
}

export default function CallButton({ onMakeCall, isGlobalCall = false }: CallButtonProps) {
  const { appearance } = useTheme()
  const { isInCall: globalIsInCall } = useGlobalStringee()
  const [showCallMenu, setShowCallMenu] = useState(false)

  // Close call menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const callMenuContainer = target.closest('[data-call-menu]')
      if (!callMenuContainer && showCallMenu) {
        setShowCallMenu(false)
      }
    }
    
    if (showCallMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showCallMenu])

  // Don't show button if it's a global call or there's an ongoing call
  if (isGlobalCall || globalIsInCall) {
    return null
  }

  return (
    <div style={{ position: 'relative' }} data-call-menu>
      <button 
        onClick={() => setShowCallMenu(!showCallMenu)} 
        disabled={globalIsInCall}
        title={globalIsInCall ? "Cuộc gọi đang diễn ra" : "Call"}
        className={`
          inline-flex items-center justify-center
          h-8 w-8
          text-sm font-medium
          rounded-md
          border-0
          bg-transparent
          text-gray-12
          hover:bg-gray-3
          transition-colors
          cursor-pointer
          ${globalIsInCall ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}
        `}
      >
        <FiPhone size={16} />
      </button>

      {/* Call Menu Dropdown */}
      {showCallMenu && !globalIsInCall && (
        <div style={{
          position: 'absolute',
          top: '42px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: appearance === 'light' ? '#ffffff' : '#2a2a2a',
          borderRadius: '12px',
          boxShadow: appearance === 'light' 
            ? '0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)' 
            : '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          padding: '8px',
          minWidth: '140px',
          zIndex: 1000,
          border: appearance === 'light' ? '1px solid #e5e7eb' : '1px solid #404040'
        }}>
          {/* Audio Call Option */}
          <button
            onClick={() => {
              onMakeCall(false)
              setShowCallMenu(false)
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              background: 'transparent',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: appearance === 'light' ? '#374151' : '#f3f4f6',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = appearance === 'light' ? '#f9fafb' : '#3a3a3a'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <FiPhoneCall size={16} style={{ color: '#10b981' }} />
            <span>Gọi Audio</span>
          </button>
          
          {/* Video Call Option */}
          <button
            onClick={() => {
              onMakeCall(true)
              setShowCallMenu(false)
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              background: 'transparent',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: appearance === 'light' ? '#374151' : '#f3f4f6',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = appearance === 'light' ? '#f9fafb' : '#3a3a3a'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <FiVideo size={16} style={{ color: '#3b82f6' }} />
            <span>Gọi Video</span>
          </button>
        </div>
      )}
    </div>
  )
} 