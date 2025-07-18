import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useTranslation } from "react-i18next";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyReportsChartProps {
  data: { month: string; reports: number }[];
}

export const MonthlyReportsChart: React.FC<MonthlyReportsChartProps> = ({ data }) => {
  // Responsive: détecte si mobile
  const [isMobile, setIsMobile] = React.useState(false);
  const { t } = useTranslation();
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 900);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const chartData = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        label: t('monthlyReportsChart.generatedReports'),
        data: data.map((item) => item.reports),
        fill: false,
        borderColor: "#0066FF",
        backgroundColor: "#0066FF",
        tension: 0.4, // courbe lissée
        pointBackgroundColor: "#fff",
        pointBorderColor: "#0066FF",
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBorderWidth: 3,
        pointHoverBackgroundColor: "#0066FF",
        pointHoverBorderColor: "#fff",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: "#fff",
        titleColor: "#637381",
        bodyColor: "#0066FF",
        borderColor: "#c9cccf",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => `${t('monthlyReportsChart.month')} : ${context[0].label}`,
          label: (context: any) => `${t('monthlyReportsChart.reports')} : ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#637381", font: { size: 13 } },
        border: { color: "#c9cccf" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f3f4f6" },
        ticks: { color: "#637381", font: { size: 13 } },
        border: { color: "#c9cccf" },
      },
    },
  } as const;

  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px 0 rgba(0,0,0,0.06)", padding: isMobile ? 12 : 24, minHeight: isMobile ? 220 : 320, width: "100%" }}>
      <div style={{ width: "100%", height: isMobile ? 240 : 340 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}; 