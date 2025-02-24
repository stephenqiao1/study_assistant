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
import { AggregatedData } from '@/types/insights'

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

interface StudyTimeChartProps {
  aggregatedData: AggregatedData
}

export default function StudyTimeChart({ aggregatedData }: StudyTimeChartProps) {
  const labels = Object.keys(aggregatedData).sort()
  const dataValues = labels.map(label => aggregatedData[label])

  const data = {
    labels,
    datasets: [
      {
        label: 'Total Study Time (minutes)',
        data: dataValues,
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
            return `${Math.round(value)} minutes`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Minutes'
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