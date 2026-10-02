import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { legendStyle, tooltipContentStyle, tooltipLabelStyle } from './chartStyles';
import type { EpochPoint } from '../shared/types';

interface TrainingChartProps {
    history: EpochPoint[];
    totalEpochs: number;
    height?: number;
}

const formatTooltipValue = (value: number, name: string) =>
    [name === 'Validation accuracy' ? value.toFixed(3) : value.toFixed(4), name] as [string, string];

const TrainingChart: React.FC<TrainingChartProps> = ({ history, totalEpochs, height = 300 }) => (
    <ResponsiveContainer width="100%" height={height}>
        <LineChart data={history} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
                dataKey="epoch"
                type="number"
                domain={[1, Math.max(totalEpochs, 2)]}
                allowDecimals={false}
                label={{ value: 'Epoch', position: 'insideBottom', offset: -4 }}
            />
            <YAxis yAxisId="loss" domain={[0, 'auto']} tickFormatter={(v: number) => v.toFixed(2)} />
            <YAxis yAxisId="accuracy" orientation="right" domain={[0, 1]} tickFormatter={(v: number) => v.toFixed(1)} />
            <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                labelFormatter={(epoch) => `Epoch ${epoch}`}
                formatter={formatTooltipValue}
            />
            <Legend wrapperStyle={legendStyle} verticalAlign="top" height={32} />
            <Line yAxisId="loss" type="monotone" dataKey="trainLoss" name="Training loss" stroke="#95a5a6" strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line yAxisId="loss" type="monotone" dataKey="valLoss" name="Validation loss" stroke="#e74c3c" dot={false} isAnimationActive={false} />
            <Line yAxisId="accuracy" type="monotone" dataKey="accuracy" name="Validation accuracy" stroke="#27ae60" dot={false} isAnimationActive={false} />
        </LineChart>
    </ResponsiveContainer>
);

export default TrainingChart;
