import { Line } from 'react-chartjs-2'
import { Chart, LineElement, PointElement, CategoryScale, LinearScale } from 'chart.js'

Chart.register(LineElement, PointElement, CategoryScale, LinearScale)

export default function VitalsChart({ data }: { data: any }) {
  const chartData = {
    labels: (data || []).map((p: any) => p.date),
    datasets: [
      { label: 'Heart rate', data: (data || []).map((p: any) => p.value), borderColor: '#ff3b30', tension: 0.3 },
    ],
  }

  const options = { scales: { x: { type: 'category' } } }

  return (
    <div className="vitals-chart">
      <Line data={chartData} options={options as any} />
    </div>
  )
}
