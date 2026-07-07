import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { companies, layers, modelConfig } from '../../data/loader'
import { scoreCompany } from '../../model'
import { useAppStore } from '../../store'
import type { ScoredCompany } from '../../model'

interface TooltipData {
  x: number
  y: number
  name: string
  ticker: string | null | undefined
  floorScore: number
  ceilingAdjusted: number
  entryScore: number
}

export function FloorCeilingScatter() {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { activeLayerIds, selectCompany } = useAppStore()

  // Build layer accent color map
  const layerColorMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of layers) m.set(l.id, l.accent_color)
    return m
  }, [])

  // Score all companies that have a model
  const scored: ScoredCompany[] = useMemo(() => {
    return companies
      .filter((c) => c.model)
      .map((c) => scoreCompany(c, modelConfig))
  }, [])

  // Filter by active layers
  const visible = useMemo(() => {
    if (activeLayerIds.length === 0) return scored
    return scored.filter((s) => activeLayerIds.includes(s.company.layer))
  }, [scored, activeLayerIds])

  useEffect(() => {
    const svg = svgRef.current
    const tooltipEl = tooltipRef.current
    if (!svg || !tooltipEl) return

    const margin = { top: 30, right: 30, bottom: 50, left: 50 }
    const width = svg.clientWidth - margin.left - margin.right
    const height = svg.clientHeight - margin.top - margin.bottom

    if (width <= 0 || height <= 0) return

    // Clear previous render
    d3.select(svg).selectAll('*').remove()

    const g = d3.select(svg)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const xScale = d3.scaleLinear().domain([0, 10]).range([0, width])
    const yScale = d3.scaleLinear().domain([0, 12]).range([height, 0])
    const rScale = d3.scaleSqrt()
      .domain([0.1, d3.max(visible, (d) => d.currentMarketCapB) ?? 4000])
      .range([4, 20])

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .selectAll('text, line, path')
      .style('stroke', '#475569')
      .style('fill', '#64748b')

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text, line, path')
      .style('stroke', '#475569')
      .style('fill', '#64748b')

    // Axis labels
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '11')
      .text('Floor Score →')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -38)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '11')
      .text('← Ceiling Score')

    // Quadrant lines
    g.append('line')
      .attr('x1', xScale(5)).attr('x2', xScale(5))
      .attr('y1', 0).attr('y2', height)
      .attr('stroke', '#334155').attr('stroke-dasharray', '4 4')

    g.append('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', yScale(5)).attr('y2', yScale(5))
      .attr('stroke', '#334155').attr('stroke-dasharray', '4 4')

    // Quadrant labels
    const quadrantLabelStyle = { fill: '#475569', fontSize: '10' }
    g.append('text').attr('x', xScale(7.5)).attr('y', yScale(9)).attr('text-anchor', 'middle').style('fill', quadrantLabelStyle.fill).style('font-size', quadrantLabelStyle.fontSize).text('Strong floor + High ceiling')
    g.append('text').attr('x', xScale(2.5)).attr('y', yScale(9)).attr('text-anchor', 'middle').style('fill', quadrantLabelStyle.fill).style('font-size', quadrantLabelStyle.fontSize).text('Weak floor + High ceiling')
    g.append('text').attr('x', xScale(7.5)).attr('y', yScale(1.5)).attr('text-anchor', 'middle').style('fill', quadrantLabelStyle.fill).style('font-size', quadrantLabelStyle.fontSize).text('Strong floor + Low ceiling')
    g.append('text').attr('x', xScale(2.5)).attr('y', yScale(1.5)).attr('text-anchor', 'middle').style('fill', quadrantLabelStyle.fill).style('font-size', quadrantLabelStyle.fontSize).text('Weak floor + Low ceiling')

    // Bubbles
    g.selectAll('circle')
      .data(visible)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.floorScore))
      .attr('cy', (d) => yScale(d.ceilingAdjusted))
      .attr('r', (d) => rScale(Math.max(d.currentMarketCapB, 0.1)))
      .attr('fill', (d) => layerColorMap.get(d.company.layer) ?? '#6366f1')
      .attr('fill-opacity', 0.7)
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mousemove', (event: MouseEvent, d) => {
        const tip: TooltipData = {
          x: event.clientX,
          y: event.clientY,
          name: d.company.name,
          ticker: d.company.ticker,
          floorScore: d.floorScore,
          ceilingAdjusted: d.ceilingAdjusted,
          entryScore: d.entryScore,
        }
        tooltipEl.style.display = 'block'
        tooltipEl.style.left = `${tip.x + 12}px`
        tooltipEl.style.top = `${tip.y - 28}px`
        tooltipEl.innerHTML = `
          <div class="font-medium text-slate-100">${tip.name}${tip.ticker ? ` <span class="text-slate-400 font-mono text-xs">${tip.ticker}</span>` : ''}</div>
          <div class="text-slate-400 text-xs font-mono">Floor: ${tip.floorScore.toFixed(1)} | Ceil: ${tip.ceilingAdjusted.toFixed(1)} | Entry: ${tip.entryScore.toFixed(2)}</div>
        `
      })
      .on('mouseleave', () => {
        tooltipEl.style.display = 'none'
      })
      .on('click', (_event: MouseEvent, d) => {
        selectCompany(d.company.id)
      })
  }, [visible, layerColorMap, selectCompany])

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" style={{ minHeight: 400 }} />
      <div
        ref={tooltipRef}
        style={{ display: 'none', position: 'fixed', pointerEvents: 'none', zIndex: 100 }}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm shadow-xl"
      />
    </div>
  )
}
