export const formatCallDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const getDisplayName = (
  incoming: any, 
  callerUserName: string, 
  callerData: any, 
  callerUserId: string,
  userData: any,
  toUserId: string
) => {
  if (incoming) {
    // For incoming calls, show caller info
    if (callerUserName) {
      return callerUserName
    }
    if (callerData?.full_name) {
      return callerData.full_name
    }
    if (callerData?.first_name) {
      return callerData.first_name
    }
    return callerUserId || 'Unknown Caller'
  } else {
    // For outgoing calls, show callee info
    if (userData?.full_name) {
      return userData.full_name
    }
    if (userData?.first_name) {
      return userData.first_name
    }
    return toUserId
  }
}

export const getUserAvatar = (incoming: any, callerData: any, userData: any) => {
  if (incoming) {
    // For incoming calls, show caller avatar
    return callerData?.user_image || null
  } else {
    // For outgoing calls, show callee avatar
    return userData?.user_image || null
  }
}

export const getAvatarInitials = (
  displayName: string,
  toUserId: string,
  incoming: any,
  callerUserId: string
) => {
  if (displayName && displayName !== toUserId && displayName !== 'Unknown Caller') {
    const words = displayName.split(' ')
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return displayName[0].toUpperCase()
  }
  return (incoming ? (callerUserId?.[0] || 'U') : toUserId[0]).toUpperCase()
}

export const generateFallbackSessionId = (type: 'incoming' | 'outgoing', fromUserId: string, toUserId: string) => {
  return `${type}_${fromUserId}_${toUserId}_${Date.now()}`
} 