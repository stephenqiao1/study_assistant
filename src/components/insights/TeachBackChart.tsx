'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
  Scale as _ChartScale
} from 'chart.js'
import { TeachBackSession, TimePeriod } from '@/types/insights'
import { format, startOfWeek, startOfMonth } from 'date-fns'
import { Scale as _Scale } from 'lucide-react'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface TeachBackChartProps {
  teachBacks: TeachBackSession[]
  period: TimePeriod
}

export default function TeachBackChart({ teachBacks, period }: TeachBackChartProps) {
  // Group teach-backs by period
  const groupedData: { [key: string]: TeachBackSession[] } = {}
  teachBacks.forEach(tb => {
    const date = new Date(tb.created_at)
    let key: string

    switch (period) {
      case 'day':
        key = format(date, 'yyyy-MM-dd')
        break
      case 'week':
        key = format(startOfWeek(date), 'yyyy-MM-dd')
        break
      case 'month':
        key = format(startOfMonth(date), 'yyyy-MM')
        break
    }

    if (!groupedData[key]) {
      groupedData[key] = []
    }
    groupedData[key].push(tb)
  })

  // Calculate average grades for each period
  const labels = Object.keys(groupedData).sort()
  const averageGrades = labels.map(label => {
    const sessions = groupedData[label]
    const total = sessions.reduce((sum, tb) => sum + tb.grade, 0)
    return total / sessions.length
  })

  // Calculate the maximum grade with padding (if not already 100)
  const maxValue = Math.max(...averageGrades, 80); // Set a minimum of 80 for better visibility
  const paddedMaxValue = Math.min(100, maxValue * 1.15); // Add 15% padding, but cap at 100%

  const data = {
    labels,
    datasets: [
      {
        label: 'Overall Grade',
        data: averageGrades,
        borderColor: 'rgb(34, 197, 94)', // green-500
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        position: 'nearest' as const,
        padding: 10,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const value = context.parsed.y
            return `Grade: ${Math.round(value)}%`
          },
          title: (tooltipItems: TooltipItem<'line'>[]) => {
            return tooltipItems[0].label;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: paddedMaxValue,
        max: 100,
        title: {
          display: true,
          text: 'Grade (%)'
        },
        ticks: {
          padding: 10
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 10,
        left: 10
      }
    }
  }

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg p-4">
      <Line data={data} options={options} />
    </div>
  )
} 