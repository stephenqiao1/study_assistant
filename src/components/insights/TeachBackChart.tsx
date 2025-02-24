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
  TooltipItem
} from 'chart.js'
import { TeachBackSession, TimePeriod } from '@/types/insights'
import { format, startOfWeek, startOfMonth } from 'date-fns'

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

  const data = {
    labels,
    datasets: [
      {
        label: 'Overall Grade',
        data: averageGrades,
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const value = context.parsed.y
            return `Grade: ${Math.round(value)}%`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Grade (%)'
        }
      }
    }
  }

  return (
    <div className="w-full h-[400px] bg-white rounded-lg p-4 border">
      <Line data={data} options={options} />
    </div>
  )
} 