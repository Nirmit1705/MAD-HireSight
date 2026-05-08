import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Line, G, Text as SvgText } from 'react-native-svg';

interface RadarData {
  label: string;
  value: number;
}

interface RadarChartProps {
  data: RadarData[];
  size?: number;
  showLabels?: boolean;
  showGrid?: boolean;
}

const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 300,
  showLabels = true,
  showGrid = true,
}) => {
  if (!data || data.length === 0) return null;

  const center = size / 2;
  const maxRadius = (size / 2) * 0.8;
  const angleStep = (Math.PI * 2) / data.length;

  const getCoordinates = (index: number, value: number, radius: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const points = data
    .map((item, index) => {
      const { x, y } = getCoordinates(index, item.value, maxRadius);
      return `${x},${y}`;
    })
    .join(' ');

  const gridCircles = [20, 40, 60, 80, 100];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Grid Circles */}
        {showGrid &&
          gridCircles.map((level) => (
            <Circle
              key={`grid-${level}`}
              cx={center}
              cy={center}
              r={(level / 100) * maxRadius}
              stroke="#e5e7eb"
              strokeWidth="1"
              fill="none"
            />
          ))}

        {/* Spokes */}
        {showGrid &&
          data.map((_, index) => {
            const { x, y } = getCoordinates(index, 100, maxRadius);
            return (
              <Line
                key={`spoke-${index}`}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}

        {/* Polygon */}
        <Polygon
          points={points}
          fill="rgba(0, 0, 0, 0.15)"
          stroke="#000"
          strokeWidth="2"
        />

        {/* Data Points */}
        {data.map((item, index) => {
          const { x, y } = getCoordinates(index, item.value, maxRadius);
          return (
            <Circle
              key={`point-${index}`}
              cx={x}
              cy={y}
              r="4"
              fill="#000"
            />
          );
        })}

        {/* Labels */}
        {showLabels &&
          data.map((item, index) => {
            const { x, y } = getCoordinates(index, 115, maxRadius);
            return (
              <SvgText
                key={`label-${index}`}
                x={x}
                y={y}
                fill="#6b7280"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {item.label}
              </SvgText>
            );
          })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});

export default RadarChart;
