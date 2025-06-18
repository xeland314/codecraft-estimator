
"use client";

import type * as React from 'react';
import { useMemo } from 'react';
import type { Module, Risk, Task, TimeUnit } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, Tooltip, Legend, ResponsiveContainer, LegendProps, TooltipProps } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Decimal } from 'decimal.js';
import { convertToMinutes, formatTime } from '@/lib/timeUtils';
import { AreaChart, BarChartHorizontalBig, PieChartIcon } from 'lucide-react';

interface AnalyticsSectionProps {
  modules: Module[];
  risks: Risk[];
  effortMultiplier: number;
}

const CHART_HEIGHT = 350;

// Custom Tooltip Content for Recharts
const CustomTooltipContent = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const formattedTime = formatTime(new Decimal(data.value || 0));
    return (
      <div className="p-2 bg-background border border-border rounded shadow-lg text-sm">
        <p className="font-semibold">{`${label}`}</p>
        <p style={{ color: data.payload.fill || data.color }}>{`${data.name}: ${formattedTime}`}</p>
        {payload[1] && <p style={{ color: payload[1].payload.fill || payload[1].color }}>{`${payload[1].name}: ${formatTime(new Decimal(payload[1].value || 0))}`}</p>}
        {payload[2] && <p style={{ color: payload[2].payload.fill || payload[2].color }}>{`${payload[2].name}: ${formatTime(new Decimal(payload[2].value || 0))}`}</p>}
      </div>
    );
  }
  return null;
};

const CustomLegendContent = (props: LegendProps) => {
  const { payload } = props;
  return (
    <ul className="flex justify-center space-x-4 text-sm mt-2">
      {payload?.map((entry, index) => (
        <li key={`item-${index}`} style={{ color: entry.color }} className="flex items-center">
          <span style={{ backgroundColor: entry.color, width: '10px', height: '10px', marginRight: '5px', display: 'inline-block' }}></span>
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
    totalTime: { label: "Total Time (Minutes)", color: "hsl(var(--chart-1))" }, // Base color, actual fill is per bar
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
    }).filter(m => m.value > 0); // Filter out modules with no time

    // Assign distinct colors for stacked bar
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


  if (modules.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <AreaChart className="mr-2 h-6 w-6 text-primary" />
            Project Analytics
          </CardTitle>
          <CardDescription>
            Generate modules and tasks to see project analytics and visualizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available for analytics. Please add modules and tasks first.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
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
              <ChartLegend content={<ChartLegendContent />} />
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
                    <ChartLegend content={<ChartLegendContent />} wrapperStyle={{paddingTop: '20px'}} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
