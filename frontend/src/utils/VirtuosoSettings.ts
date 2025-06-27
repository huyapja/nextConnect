const cores = navigator.hardwareConcurrency || 4

let performanceLevel = 'low'

if (cores >= 8) performanceLevel = 'high'
else if (cores >= 6) performanceLevel = 'mid'

export const virtuosoSettings = {
  increaseViewportBy: performanceLevel === 'high' ? 800 : performanceLevel === 'mid' ? 500 : 300,
  overscan: performanceLevel === 'high' ? 80 : performanceLevel === 'mid' ? 50 : 30,
  initialItemCount: performanceLevel === 'high' ? 50 : performanceLevel === 'mid' ? 30 : 15,
  defaultItemHeight: 60
}
