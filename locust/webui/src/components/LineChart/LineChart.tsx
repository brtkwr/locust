import { useEffect, useState, useRef } from 'react';
import {
  init,
  dispose,
  ECharts,
  EChartsOption,
  DefaultLabelFormatterCallbackParams,
  connect,
  TooltipComponentOption,
} from 'echarts';

import { useSelector } from 'redux/hooks';
import { IUiState } from 'redux/slice/ui.slice';
import { ICharts } from 'types/ui.types';
import { formatLocaleString, formatLocaleTime } from 'utils/date';

interface ILine {
  name: string;
  key: keyof ICharts;
}

interface ICreateOptions {
  title: string;
  seriesData: EChartsOption['Series'][];
  charts: ICharts;
  colors?: string[];
}

export interface ILineChartProps {
  title: string;
  lines: ILine[];
  colors?: string[];
}

interface ILineChart extends ILineChartProps {
  charts: ICharts;
}

interface ILineChartZoomEvent {
  batch?: { start: number; end: number }[];
}

const createOptions = ({ charts, title, seriesData, colors }: ICreateOptions) => ({
  title: {
    text: title,
    x: 10,
    y: 10,
  },
  dataZoom: [
    {
      type: 'inside',
      start: 0,
      end: 100,
    },
  ],
  tooltip: {
    trigger: 'axis',
    formatter: (params: TooltipComponentOption) => {
      if (
        !!params &&
        Array.isArray(params) &&
        params.length > 0 &&
        params.some(param => !!param.value)
      ) {
        return params.reduce(
          (tooltipText, { axisValue, color, seriesName, value }, index) => `
          ${index === 0 ? formatLocaleString(axisValue) : ''}
          ${tooltipText}
          <br>
          <span style="color:${color};">
            ${seriesName}:&nbsp${value}
          </span>
        `,
          '',
        );
      } else {
        return 'No data';
      }
    },
    axisPointer: {
      animation: true,
    },
    backgroundColor: 'rgba(21,35,28, 0.93)',
    borderWidth: 0,
    extraCssText: 'z-index:1;',
  },
  xAxis: {
    type: 'category',
    splitLine: {
      show: false,
    },
    axisLabel: {
      formatter: formatLocaleTime,
    },
    data: charts.time,
  },
  yAxis: {
    type: 'value',
    boundaryGap: [0, '5%'],
  },
  series: seriesData,
  grid: { x: 60, y: 70, x2: 40, y2: 40 },
  color: colors,
  toolbox: {
    feature: {
      restore: {
        show: false,
        title: 'Reset',
      },
      saveAsImage: {
        name: title.replace(/\s+/g, '_').toLowerCase() + '_' + new Date().getTime() / 1000,
        title: 'Download as PNG',
        emphasis: {
          iconStyle: {
            textPosition: 'left',
          },
        },
      },
    },
  },
});

const getSeriesData = ({ charts, lines }: { charts: IUiState['charts']; lines: ILine[] }) =>
  lines.map(({ key, name }) => ({
    name,
    type: 'line',
    showSymbol: true,
    data: charts[key],
  }));

const createMarkLine = (charts: ICharts, isDarkMode: boolean) => ({
  symbol: 'none',
  label: {
    formatter: (params: DefaultLabelFormatterCallbackParams) => `Run #${params.dataIndex + 1}`,
  },
  lineStyle: { color: isDarkMode ? '#5b6f66' : '#000' },
  data: (charts.markers || []).map((timeMarker: string) => ({ xAxis: timeMarker })),
});

export default function LineChart({ charts, title, lines, colors }: ILineChart) {
  const [chart, setChart] = useState<ECharts | null>(null);
  const isDarkMode = useSelector(({ theme: { isDarkMode } }) => isDarkMode);

  const chartContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartContainer.current) {
      return;
    }

    const initChart = init(chartContainer.current, 'locust');
    initChart.setOption(
      createOptions({ charts, title, seriesData: getSeriesData({ charts, lines }), colors }),
    );
    initChart.on('datazoom', datazoom => {
      const { batch } = datazoom as ILineChartZoomEvent;
      if (!batch) {
        return;
      }

      const [{ start, end }] = batch;

      if (start > 0 && end < 100) {
        initChart.setOption({
          toolbox: {
            feature: {
              restore: {
                show: true,
              },
            },
          },
          dataZoom: [
            {
              type: 'inside',
              start,
              end,
            },
            {
              type: 'slider',
              show: true,
              start,
              end,
            },
          ],
        });
      } else {
        initChart.setOption({
          toolbox: {
            feature: {
              restore: {
                show: false,
              },
            },
          },
          dataZoom: [
            {
              type: 'inside',
              start,
              end,
            },
            {
              type: 'slider',
              show: false,
              start,
              end,
            },
          ],
        });
      }
    });

    const handleChartResize = () => initChart.resize();
    window.addEventListener('resize', handleChartResize);

    initChart.group = 'swarmCharts';
    connect('swarmCharts');

    setChart(initChart);

    return () => {
      dispose(initChart);
      window.removeEventListener('resize', handleChartResize);
    };
  }, [chartContainer]);

  useEffect(() => {
    const isChartDataDefined = lines.every(({ key }) => !!charts[key]);
    if (chart && isChartDataDefined) {
      chart.setOption({
        xAxis: { data: charts.time },
        series: lines.map(({ key }, index) => ({
          data: charts[key],
          ...(index === 0 ? { markLine: createMarkLine(charts, isDarkMode) } : {}),
        })),
      });
    }
  }, [charts, chart, lines, isDarkMode]);

  useEffect(() => {
    if (chart) {
      const chartTextColor = isDarkMode ? '#b3c3bc' : '#000';
      const chartAxisColor = isDarkMode ? '#5b6f66' : '#000';

      chart.setOption({
        backgroundColor: isDarkMode ? '#27272a' : '#fff',
        textStyle: { color: chartTextColor },
        title: {
          textStyle: { color: chartTextColor },
        },
        legend: {
          icon: 'circle',
          inactiveColor: chartTextColor,
          textStyle: {
            color: chartTextColor,
          },
        },
        tooltip: {
          textStyle: {
            color: chartTextColor,
            fontSize: 13,
          },
        },
        xAxis: {
          axisLine: {
            lineStyle: {
              color: chartAxisColor,
            },
          },
        },
        yAxis: {
          axisLine: {
            lineStyle: {
              color: chartAxisColor,
            },
          },
          splitLine: {
            lineStyle: {
              color: isDarkMode ? '#4c4c52' : '#ddd',
            },
          },
        },
      });
    }
  }, [chart, isDarkMode]);

  return <div ref={chartContainer} style={{ width: '100%', height: '300px' }}></div>;
}
