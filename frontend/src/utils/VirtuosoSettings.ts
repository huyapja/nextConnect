const cores = navigator.hardwareConcurrency || 4

let performanceLevel = 'low'

if (cores >= 8) performanceLevel = 'high'
else if (cores >= 6) performanceLevel = 'mid'

export const virtuosoSettings = {
  increaseViewportBy: 2000,
  overscan: 200,
  initialItemCount: 50,
  defaultItemHeight: 60
}
