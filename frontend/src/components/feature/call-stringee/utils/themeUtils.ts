export const getIconColor = (color: 'green' | 'blue' | 'red' | 'white' | 'gray', appearance: string) => {
  const isDark = appearance === 'dark' || (appearance === 'inherit' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  switch (color) {
    case 'green':
      return isDark ? '#2ed573' : '#10b981'
    case 'blue': 
      return isDark ? '#3b82f6' : '#2563eb'
    case 'red':
      return '#ff4757'
    case 'white':
      return isDark ? '#ffffff' : '#000000'
    case 'gray':
      return isDark ? '#9ca3af' : '#6b7280'
    default:
      return isDark ? '#ffffff' : '#000000'
  }
}

export const getBackgroundColor = (type: 'button' | 'modal', appearance: string) => {
  const isDark = appearance === 'dark' || (appearance === 'inherit' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  if (type === 'button') {
    return isDark ? '#606060' : '#e5e7eb'
  }
  return isDark ? '#1a1a1a' : '#ffffff'
} 