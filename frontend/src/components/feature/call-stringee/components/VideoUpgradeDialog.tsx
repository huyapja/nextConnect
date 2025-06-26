import { FiVideo } from 'react-icons/fi'
import { useTheme } from '@/ThemeProvider'
import { getIconColor, getBackgroundColor } from '../utils/themeUtils'
import { VideoUpgradeRequest } from '../types'

interface VideoUpgradeDialogProps {
  videoUpgradeRequest: VideoUpgradeRequest
  callerUserName: string
  onAccept: () => void
  onReject: () => void
}

export default function VideoUpgradeDialog({ 
  videoUpgradeRequest, 
  callerUserName, 
  onAccept, 
  onReject 
}: VideoUpgradeDialogProps) {
  const { appearance } = useTheme()
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: appearance === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.8)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: getBackgroundColor('modal', appearance),
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '400px',
        textAlign: 'center',
        border: appearance === 'light' ? '1px solid #e5e7eb' : '1px solid #333',
        boxShadow: appearance === 'light' 
          ? '0 10px 40px rgba(0, 0, 0, 0.15)' 
          : '0 10px 40px rgba(0, 0, 0, 0.6)'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
          color: getIconColor('blue', appearance)
        }}>
          <FiVideo size={48} />
        </div>
        <h3 style={{
          color: getIconColor('white', appearance),
          fontSize: '22px',
          margin: '0 0 12px',
          fontWeight: '600'
        }}>
          Yêu cầu bật camera
        </h3>
        <p style={{
          color: getIconColor('gray', appearance),
          fontSize: '16px',
          margin: '0 0 30px',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: getIconColor('white', appearance) }}>
            {videoUpgradeRequest.fromUserName || callerUserName || videoUpgradeRequest.fromUser}
          </strong> muốn chuyển sang chế độ Gọi video. Bạn có đồng ý không?
        </p>
        <div style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onReject}
            style={{
              padding: '12px 24px',
              borderRadius: '25px',
              border: 'none',
              backgroundColor: getBackgroundColor('button', appearance),
              color: getIconColor('white', appearance),
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              minWidth: '100px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.8'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            Từ chối
          </button>
          <button
            onClick={onAccept}
            style={{
              padding: '12px 24px',
              borderRadius: '25px',
              border: 'none',
              backgroundColor: getIconColor('green', appearance),
              color: 'white',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              minWidth: '100px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  )
} 