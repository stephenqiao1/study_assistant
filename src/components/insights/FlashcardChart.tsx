'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { FlashcardMetrics } from '@/types/insights'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

// Explicit type declaration for Chart.js tooltip context
type ChartContextData = {
  label?: string;
  data: Array<number | null>;
};

interface FlashcardChartProps {
  flashcardMetrics: FlashcardMetrics
}

export default function FlashcardChart({ flashcardMetrics }: FlashcardChartProps) {
  const labels = ['Easy', 'Good', 'Hard', 'Forgot']
  const responseData = [
    flashcardMetrics.responseBreakdown.easy,
    flashcardMetrics.responseBreakdown.good,
    flashcardMetrics.responseBreakdown.hard,
    flashcardMetrics.responseBreakdown.forgot
  ]
  
  const statusData = [
    flashcardMetrics.statusBreakdown.known,
    flashcardMetrics.statusBreakdown.learning,
    flashcardMetrics.statusBreakdown.new
  ]

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          // Using Function.prototype here to avoid type errors with Chart.js
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: function(context: any) {
            // Safely handle the Chart.js context with proper type narrowing
            const dataset = context.dataset as ChartContextData;
            const label = dataset.label || '';
            const value = context.parsed.y || 0;
            
            // Calculate total with safe typechecking
            let total = 0;
            if (Array.isArray(dataset.data)) {
              total = dataset.data.reduce(
                (sum: number, item) => sum + (typeof item === 'number' ? item : 0), 
                0
              );
            }
            
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  const responseChartData = {
    labels,
    datasets: [
      {
        label: 'Response Distribution',
        data: responseData,
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',  // Easy - Green
          'rgba(54, 162, 235, 0.6)',  // Good - Blue
          'rgba(255, 206, 86, 0.6)',  // Hard - Yellow
          'rgba(255, 99, 132, 0.6)',  // Forgot - Red
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const statusChartData = {
    labels: ['Mastered', 'Learning', 'Need Review'],
    datasets: [
      {
        label: 'Card Status Distribution',
        data: statusData,
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',  // Known - Green
          'rgba(54, 162, 235, 0.6)',  // Learning - Blue
          'rgba(255, 206, 86, 0.6)',  // New - Yellow
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-4 rounded-lg shadow h-[300px]">
        <h3 className="text-lg font-medium mb-4 text-center">Response Distribution</h3>
        <Bar data={responseChartData} options={options} />
      </div>
      <div className="bg-white p-4 rounded-lg shadow h-[300px]">
        <h3 className="text-lg font-medium mb-4 text-center">Card Status Distribution</h3>
        <Bar data={statusChartData} options={options} />
      </div>
    </div>
  )
} 