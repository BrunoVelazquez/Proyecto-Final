export function getCampaignShapeSvg(campaignIndex, color, radius) {
  const size = radius * 2
  const strokeW = 2
  const fOpacity = 0.25
  const sOpacity = 0.8

  let svgContent = ''
  
  if (campaignIndex % 4 === 0) {
    // Círculo
    svgContent = `<circle cx="${radius}" cy="${radius}" r="${radius - strokeW/2}" fill="currentColor" fill-opacity="${fOpacity}" stroke="currentColor" stroke-width="${strokeW}" stroke-opacity="${sOpacity}"/>`
  } else if (campaignIndex % 4 === 1) {
    // Cuadrado
    const s = size - strokeW
    svgContent = `<rect x="${strokeW/2}" y="${strokeW/2}" width="${s}" height="${s}" rx="1" fill="currentColor" fill-opacity="${fOpacity}" stroke="currentColor" stroke-width="${strokeW}" stroke-opacity="${sOpacity}"/>`
  } else if (campaignIndex % 4 === 2) {
    // Triángulo
    const d = size - strokeW/2
    const h = strokeW/2
    const mid = radius
    svgContent = `<polygon points="${mid},${h} ${d},${d} ${h},${d}" fill="currentColor" fill-opacity="${fOpacity}" stroke="currentColor" stroke-width="${strokeW}" stroke-opacity="${sOpacity}" stroke-linejoin="round"/>`
  } else {
    // Diamante
    const d = size - strokeW/2
    const h = strokeW/2
    svgContent = `<polygon points="${radius},${h} ${d},${radius} ${radius},${d} ${h},${radius}" fill="currentColor" fill-opacity="${fOpacity}" stroke="currentColor" stroke-width="${strokeW}" stroke-opacity="${sOpacity}" stroke-linejoin="round"/>`
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="color: ${color}; overflow: visible;">${svgContent}</svg>`
}
