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
import { AggregatedData } from '@/types/insights'
import { Scale as _ScaleReact } from 'lucide-react'

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

  // Calculate module, teach-back, and flashcard values
  const moduleValues = dataValues.map(val => val * 0.6) // Placeholder - replace with actual module data
  const teachBackValues = dataValues.map(val => val * 0.25) // Placeholder - replace with actual teach-back data
  const flashcardValues = dataValues.map(val => val * 0.15) // Placeholder - replace with actual flashcard data
  
  // Calculate the maximum value for the y-axis with padding
  const maxValue = Math.max(...dataValues);
  const paddedMaxValue = maxValue * 1.15; // Add 15% padding at the top

  const data = {
    labels,
    datasets: [
      {
        label: 'Total',
        data: dataValues,
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Modules',
        data: moduleValues,
        borderColor: 'rgb(37, 99, 235)', // blue-600
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        hidden: true
      },
      {
        label: 'Teach-Back',
        data: teachBackValues,
        borderColor: 'rgb(34, 197, 94)', // green-500
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        hidden: true
      },
      {
        label: 'Flashcards',
        data: flashcardValues,
        borderColor: 'rgb(168, 85, 247)', // purple-500
        backgroundColor: 'rgba(168, 85, 247, 0.05)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        hidden: true
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
            const value = context.parsed.y;
            const label = context.dataset.label || '';
            return `${label}: ${Math.round(value)} minutes`;
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
        title: {
          display: true,
          text: 'Minutes'
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