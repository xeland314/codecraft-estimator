
"use client";

import type * as React from 'react';
import { useMemo } from 'react';
import type { Module, Risk, Task, RiskLevel, TaskCategory } from '@/types';
import { riskLevelToNumber, TASK_CATEGORIES } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, CartesianGrid, XAxis, YAxis, ZAxis, Bar, Tooltip, Legend, ResponsiveContainer, LegendProps, TooltipProps, ScatterChart, Scatter, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Decimal } from 'decimal.js';
import { convertToMinutes, formatTime } from '@/lib/timeUtils';
import { AreaChart, BarChartHorizontalBig, PieChartIcon, AlertTriangleIcon, Layers } from 'lucide-react';

interface AnalyticsSectionProps {
  modules: Module[];
  risks: Risk[];
  effortMultiplier: number;
}

// Custom Tooltip Content for Recharts
const CustomTooltipContent = ({ active, payload, label, contentStyle, itemStyle, labelStyle }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    // Specific for Scatter (Risk) Chart
    if (payload[0].payload?.description && payload[0].payload?.riskTimeInMinutes !== undefined) {
        const riskData = payload[0].payload;
        return (
         <div className="p-2 bg-background border border-border rounded shadow-lg text-sm" style={contentStyle}>
            <p className="font-semibold" style={labelStyle}>{riskData.description}</p>
            <p style={{ color: payload[0].color, ...itemStyle }}>Prob: {riskData.probabilityLabel} ({riskData.probability})</p>
            <p style={{ color: payload[0].color, ...itemStyle }}>Impact: {riskData.impactSeverityLabel} ({riskData.impactSeverity})</p>
            <p style={{ color: payload[0].color, ...itemStyle }}>Time: {formatTime(new Decimal(riskData.riskTimeInMinutes))}</p>
          </div>
        );
    }

    // Specific for Pie Chart (Category Distribution)
    if (payload[0].payload?.name && payload[0].payload?.value !== undefined && payload[0].payload?.percent !== undefined) {
        const categoryData = payload[0].payload;
        const formattedTime = formatTime(new Decimal(categoryData.value));
        const percentage = (categoryData.percent * 100).toFixed(1);
        return (
            <div className="p-2 bg-background border border-border rounded shadow-lg text-sm" style={contentStyle}>
                <p className="font-semibold" style={labelStyle}>{categoryData.name}</p>
                <p style={{ color: payload[0].payload.fill, ...itemStyle }}>Time: {formattedTime} ({percentage}%)</p>
            </div>
        );
    }


    // Default for Bar Charts
    const data = payload[0];
    const formattedTime = formatTime(new Decimal(data.value || 0));
    return (
      <div className="p-2 bg-background border border-border rounded shadow-lg text-sm" style={contentStyle}>
        <p className="font-semibold" style={labelStyle}>{`${label || ""}`}</p>
        <p style={{ color: data.payload.fill || data.color, ...itemStyle }}>{`${data.name}: ${formattedTime}`}</p>
        {payload[1] && <p style={{ color: payload[1].payload.fill || payload[1].color, ...itemStyle }}>{`${payload[1].name}: ${formatTime(new Decimal(payload[1].value || 0))}`}</p>}
        {payload[2] && <p style={{ color: payload[2].payload.fill || payload[2].color, ...itemStyle }}>{`${payload[2].name}: ${formatTime(new Decimal(payload[2].value || 0))}`}</p>}
      </div>
    );
  }
  return null;
};

const CustomLegendContent = (props: LegendProps) => {
  const { payload } = props;
  return (
    <ul className="flex justify-center flex-wrap gap-x-4 gap-y-1 text-sm mt-2">
      {payload?.map((entry, index) => (
        <li key={`item-${index}`} style={{ color: entry.color }} className="flex items-center">
          <span style={{ backgroundColor: entry.color, width: '10px', height: '10px', marginRight: '5px', display: 'inline-block', borderRadius: entry.type === 'circle' ? '50%' : '0' }}></span>
          {entry.value}
        </li>
      ))}
    </ul>
  );
};


export default function AnalyticsSection({ modules, risks, effortMultiplier }: AnalyticsSectionProps) {
  
  const projectScenarioData = useMemo(() => {
    let optimisticTaskTime = new Decimal(0);
    let realisticTaskTime = new Decimal(0);
    let pessimisticTaskTime = new Decimal(0);

    modules.forEach(module => {
      module.tasks.forEach(task => {
        optimisticTaskTime = optimisticTaskTime.plus(convertToMinutes(task.optimisticTime, task.timeUnit));
        realisticTaskTime = realisticTaskTime.plus(task.weightedAverageTimeInMinutes);
        pessimisticTaskTime = pessimisticTaskTime.plus(convertToMinutes(task.pessimisticTime, task.timeUnit));
      });
    });

    const totalRiskTime = risks.reduce((sum, risk) => sum.plus(risk.riskTimeInMinutes), new Decimal(0));
    const multiplier = new Decimal(effortMultiplier);

    return [
      { name: 'Optimistic', totalTime: optimisticTaskTime.times(multiplier).toNumber(), fill: "hsl(var(--chart-2))" },
      { name: 'Realistic', totalTime: realisticTaskTime.plus(totalRiskTime).times(multiplier).toNumber(), fill: "hsl(var(--chart-1))" },
      { name: 'Pessimistic', totalTime: pessimisticTaskTime.plus(totalRiskTime).times(multiplier).toNumber(), fill: "hsl(var(--chart-3))" },
    ];
  }, [modules, risks, effortMultiplier]);

  const scenarioChartConfig = {
    totalTime: { label: "Total Time (Minutes)", color: "hsl(var(--chart-1))" }, 
     optimistic: { label: "Optimistic", color: "hsl(var(--chart-2))" },
     realistic: { label: "Realistic", color: "hsl(var(--chart-1))" },
     pessimistic: { label: "Pessimistic", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;


  const moduleDurationData = useMemo(() => {
    return modules.map(module => {
      let optimisticTime = new Decimal(0);
      let realisticTime = new Decimal(0);
      let pessimisticTime = new Decimal(0);
      module.tasks.forEach(task => {
        optimisticTime = optimisticTime.plus(convertToMinutes(task.optimisticTime, task.timeUnit));
        realisticTime = realisticTime.plus(task.weightedAverageTimeInMinutes);
        pessimisticTime = pessimisticTime.plus(convertToMinutes(task.pessimisticTime, task.timeUnit));
      });
      return {
        name: module.name.length > 20 ? module.name.substring(0, 17) + "..." : module.name,
        optimistic: optimisticTime.toNumber(),
        realistic: realisticTime.toNumber(),
        pessimistic: pessimisticTime.toNumber(),
      };
    });
  }, [modules]);

  const moduleDurationConfig = {
      optimistic: { label: "Optimistic", color: "hsl(var(--chart-2))" },
      realistic: { label: "Realistic", color: "hsl(var(--chart-1))" },
      pessimistic: { label: "Pessimistic", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;


  const projectCompositionData = useMemo(() => {
    const data = modules.map(module => {
      const moduleTime = module.tasks.reduce((sum, task) => sum.plus(task.weightedAverageTimeInMinutes), new Decimal(0));
      return {
        name: module.name.length > 15 ? module.name.substring(0, 12) + "..." : module.name,
        value: moduleTime.toNumber(),
      };
    }).filter(m => m.value > 0); 

    const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    return data.map((item, index) => ({ ...item, fill: chartColors[index % chartColors.length] }));

  }, [modules]);
  
  const projectCompositionConfig = useMemo(() => {
    const config: ChartConfig = {};
    projectCompositionData.forEach(item => {
        config[item.name] = { label: item.name, color: item.fill}
    });
    return config;
  }, [projectCompositionData]);

  const riskBubbleData = useMemo(() => {
    return risks.map(risk => ({
      probability: riskLevelToNumber(risk.probability),
      impactSeverity: riskLevelToNumber(risk.impactSeverity),
      riskTimeInMinutes: risk.riskTimeInMinutes,
      description: risk.description,
      probabilityLabel: risk.probability,
      impactSeverityLabel: risk.impactSeverity,
      fill: risk.impactSeverity === 'High' ? "hsl(var(--destructive))" : risk.impactSeverity === 'Medium' ? "hsl(var(--accent))" : "hsl(var(--chart-2))"
    }));
  }, [risks]);

  const riskChartConfig = {
    risks: { label: "Risks", color: "hsl(var(--chart-1))" }, // Generic, actual color per bubble
  } satisfies ChartConfig;

  const categoryTimeData = useMemo(() => {
    const categoryMap: { [key: string]: Decimal } = {};
    modules.forEach(module => {
      module.tasks.forEach(task => {
        const category = task.category || "Uncategorized";
        categoryMap[category] = (categoryMap[category] || new Decimal(0)).plus(task.weightedAverageTimeInMinutes);
      });
    });
    const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted))"];
    return Object.entries(categoryMap)
      .map(([name, value], index) => ({ name, value: value.toNumber(), fill: chartColors[index % chartColors.length] }))
      .filter(item => item.value > 0)
      .sort((a,b) => b.value - a.value); // Sort for better pie chart display
  }, [modules]);

  const categoryTimeConfig = useMemo(() => {
    const config: ChartConfig = {};
    categoryTimeData.forEach(item => {
        config[item.name] = { label: item.name, color: item.fill}
    });
    return config;
  }, [categoryTimeData]);


  if (modules.length === 0 && risks.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <AreaChart className="mr-2 h-6 w-6 text-primary" />
            Project Analytics
          </CardTitle>
          <CardDescription>
            Generate modules/tasks and add risks to see project analytics and visualizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available for analytics. Please add modules, tasks, or risks first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {modules.length > 0 && (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center">
                <BarChartHorizontalBig className="mr-2 h-5 w-5 text-primary" />
                Project Duration Scenarios
              </CardTitle>
              <CardDescription>Total project time under optimistic, realistic, and pessimistic scenarios (factoring in risks and effort multiplier).</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={scenarioChartConfig} className="min-h-[300px] w-full aspect-video">
                <BarChart data={projectScenarioData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => formatTime(new Decimal(value))} />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} />
                  <ChartTooltip content={<CustomTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}} />
                  <Bar dataKey="totalTime" name="Total Time" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center">
                <BarChart className="mr-2 h-5 w-5 text-primary" />
                Module Duration Analysis
              </CardTitle>
              <CardDescription>Optimistic, realistic (PERT), and pessimistic task time totals for each module.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={moduleDurationConfig} className="min-h-[300px] w-full aspect-video">
                <BarChart data={moduleDurationData} margin={{ bottom: 70, left:20, right: 30 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} angle={-45} textAnchor="end" interval={0} height={80} />
                  <YAxis tickFormatter={(value) => formatTime(new Decimal(value))} />
                  <ChartTooltip content={<CustomTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}}/>
                  <ChartLegend content={<CustomLegendContent />} />
                  <Bar dataKey="optimistic" fill="var(--color-optimistic)" radius={4} name="Optimistic"/>
                  <Bar dataKey="realistic" fill="var(--color-realistic)" radius={4} name="Realistic"/>
                  <Bar dataKey="pessimistic" fill="var(--color-pessimistic)" radius={4} name="Pessimistic"/>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          
          {projectCompositionData.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center">
                  <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
                  Project Composition by Module (Realistic Time)
                </CardTitle>
                <CardDescription>Distribution of total realistic project time across modules.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={projectCompositionConfig} className="min-h-[50px] w-full aspect-[16/2]">
                    <BarChart layout="vertical" data={[{name: 'Timeline', ...projectCompositionData.reduce((obj, item) => { obj[item.name] = item.value; return obj; }, {} as Record<string,number>) }]} stackOffset="expand">
                        <XAxis type="number" hide domain={[0,1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                        <YAxis type="category" dataKey="name" hide/>
                        <ChartTooltip content={<CustomTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}}/>
                        {projectCompositionData.map((item) => (
                            <Bar key={item.name} dataKey={item.name} name={item.name} fill={item.fill} stackId="a" radius={2} barSize={30}/>
                        ))}
                        <ChartLegend content={<CustomLegendContent />} wrapperStyle={{paddingTop: '20px'}} />
                    </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {categoryTimeData.length > 0 && (
             <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center">
                  <Layers className="mr-2 h-5 w-5 text-primary" />
                  Time Distribution by Task Category
                </CardTitle>
                <CardDescription>Breakdown of total realistic task time by assigned category.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={categoryTimeConfig} className="min-h-[300px] w-full aspect-square sm:aspect-video">
                  <PieChart>
                    <ChartTooltip content={<CustomTooltipContent />} />
                    <Pie 
                        data={categoryTimeData} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius="80%" 
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (percent * 100) > 5 ? ( // Only show label if slice is > 5%
                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                                {`${name} (${(percent * 100).toFixed(0)}%)`}
                                </text>
                            ) : null;
                        }}
                    >
                       {categoryTimeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <ChartLegend content={<CustomLegendContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {risks.length > 0 && (
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <AlertTriangleIcon className="mr-2 h-5 w-5 text-primary" />
              Risk Analysis (Bubble Chart)
            </CardTitle>
            <CardDescription>Visualizing risks by probability, impact severity, and time impact (bubble size).</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={riskChartConfig} className="min-h-[350px] w-full aspect-video">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid />
                <XAxis 
                    type="number" 
                    dataKey="probability" 
                    name="Probability" 
                    domain={[0.5, 3.5]} 
                    ticks={[1,2,3]} 
                    tickFormatter={(value) => ['Low', 'Medium', 'High'][value-1]} 
                />
                <YAxis 
                    type="number" 
                    dataKey="impactSeverity" 
                    name="Impact Severity" 
                    domain={[0.5, 3.5]} 
                    ticks={[1,2,3]} 
                    tickFormatter={(value) => ['Low', 'Medium', 'High'][value-1]}
                />
                <ZAxis type="number" dataKey="riskTimeInMinutes" range={[100, 1000]} name="Time Impact (minutes)" />
                <ChartTooltip content={<CustomTooltipContent />} cursor={{ strokeDasharray: '3 3' }}/>
                <Legend content={<CustomLegendContent />} payload={[{ value: 'Low Impact', type: 'circle', id: 'ID01', color: 'hsl(var(--chart-2))' }, { value: 'Medium Impact', type: 'circle', id: 'ID02', color: 'hsl(var(--accent))' }, { value: 'High Impact', type: 'circle', id: 'ID03', color: 'hsl(var(--destructive))' }]}/>
                <Scatter name="Risks" data={riskBubbleData} shape="circle" />
              </ScatterChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
