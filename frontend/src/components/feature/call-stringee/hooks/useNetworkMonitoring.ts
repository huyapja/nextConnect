import { useState, useRef, useCallback } from 'react'

interface NetworkStats {
  ping: number | null
  bitrate: number | null
  packetLoss: number | null
  networkType: string | null
}

export const useNetworkMonitoring = () => {
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    ping: null,
    bitrate: null,
    packetLoss: null,
    networkType: null
  })
  const [showDetailedStats, setShowDetailedStats] = useState(false)
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const measurePing = async (): Promise<number | null> => {
    try {
      const start = performance.now()
      const response = await fetch('/api/method/ping', { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      const end = performance.now()
      
      if (response.ok) {
        return Math.round(end - start)
      }
      
      // Fallback: ping to current domain
      const fallbackStart = performance.now()
      await fetch(window.location.origin + '/ping', { 
        method: 'HEAD',
        cache: 'no-cache'
      }).catch(() => {}) // Ignore errors
      const fallbackEnd = performance.now()
      
      return Math.round(fallbackEnd - fallbackStart)
    } catch (error) {
      return null
    }
  }

  const getNetworkType = (): string => {
    // @ts-ignore - Navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    
    if (connection) {
      if (connection.effectiveType) {
        const typeMap: { [key: string]: string } = {
          'slow-2g': '2G (Chậm)',
          '2g': '2G',
          '3g': '3G', 
          '4g': '4G/LTE'
        }
        return typeMap[connection.effectiveType] || connection.effectiveType
      }
      
      if (connection.type) {
        const typeMap: { [key: string]: string } = {
          'wifi': 'WiFi',
          'cellular': 'Di động',
          'ethernet': 'Ethernet',
          'bluetooth': 'Bluetooth'
        }
        return typeMap[connection.type] || connection.type
      }
    }
    
    return 'Không xác định'
  }

  const getWebRTCStats = async (callObj: any): Promise<{bitrate: number | null, packetLoss: number | null}> => {
    try {
      if (!callObj || !callObj.localStream) {
        return { bitrate: null, packetLoss: null }
      }

      // Try to get peer connection from Stringee call
      const peerConnection = callObj.peerConnection || callObj._peerConnection
      
      if (!peerConnection || !peerConnection.getStats) {
        return { bitrate: null, packetLoss: null }
      }

      const stats = await peerConnection.getStats()
      let bitrate: number | null = null
      let packetLoss: number | null = null

      stats.forEach((report: any) => {
        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
          if (report.bytesSent && report.timestamp) {
            // Calculate bitrate (rough estimation)
            bitrate = Math.round((report.bytesSent * 8) / 1000) // kbps
          }
        }
        
        if (report.type === 'inbound-rtp') {
          if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
            const total = report.packetsLost + report.packetsReceived
            if (total > 0) {
              packetLoss = Math.round((report.packetsLost / total) * 100 * 100) / 100 // percentage
            }
          }
        }
      })

      return { bitrate, packetLoss }
    } catch (error) {
      return { bitrate: null, packetLoss: null }
    }
  }

  const startNetworkMonitoring = useCallback((call: any) => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
    }

    const updateStats = async () => {
      try {
        const ping = await measurePing()
        const networkType = getNetworkType()
        const { bitrate, packetLoss } = await getWebRTCStats(call)

        setNetworkStats({
          ping,
          bitrate,
          packetLoss,
          networkType
        })
      } catch (error) {
        // Failed to update network stats
      }
    }

    // Update immediately
    updateStats()
    
    // Update every 3 seconds
    statsIntervalRef.current = setInterval(updateStats, 3000)
  }, [])

  const stopNetworkMonitoring = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }
    
    setNetworkStats({
      ping: null,
      bitrate: null,
      packetLoss: null,
      networkType: null
    })
  }, [])

  return {
    networkStats,
    showDetailedStats,
    setShowDetailedStats,
    startNetworkMonitoring,
    stopNetworkMonitoring
  }
} 