
"use client";

import type * as React from 'react';
import { useMemo, useState } from 'react';
import type { Module, Risk } from '@/types';
import { riskLevelToNumber } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, LegendProps, TooltipProps, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart"
import { Decimal } from 'decimal.js';
import { convertToMinutes, formatTime } from '@/lib/timeUtils';
import { AreaChart, BarChartHorizontalBig, PieChartIcon, AlertTriangleIcon, Layers, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AnalyticsSectionProps {
  readonly modules: Module[];
  readonly risks: Risk[];
  readonly effortMultiplier: number;
}

// Custom Tooltip Content for Recharts
const CustomTooltipContent = ({ active, payload, label, contentStyle, itemStyle, labelStyle }: TooltipProps<number, string>) => {
  if (active && payload?.length) {
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
      {payload?.map((entry) => (
        <li key={String(entry.value)} style={{ color: entry.color }} className="flex items-center">
          <span style={{ backgroundColor: entry.color, width: '10px', height: '10px', marginRight: '5px', display: 'inline-block', borderRadius: entry.type === 'circle' ? '50%' : '0' }}></span>
          {entry.value}
        </li>
      ))}
    </ul>
  );
};


export default function AnalyticsSection({ modules, risks, effortMultiplier }: AnalyticsSectionProps) {
  const [sortRisksBy, setSortRisksBy] = useState<'rpi' | 'probability' | 'impact' | 'time'>('rpi');
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



  // Risk Priority Index calculation and matrix data
  const riskMatrixData = useMemo(() => {
    const riskDataWithRPI = risks.map((risk, idx) => {
      const probValue = riskLevelToNumber(risk.probability);
      const impactValue = riskLevelToNumber(risk.impactSeverity);
      const timeUrgencyFactor = Math.min(1, risk.riskTimeInMinutes / 480); // Normalize by 8 hours
      const rpi = probValue * impactValue * Math.max(0.5, timeUrgencyFactor); // RPI with time weighting
      
      return {
        id: idx,
        description: risk.description,
        probability: risk.probability,
        probValue,
        impactSeverity: risk.impactSeverity,
        impactValue,
        riskTimeInMinutes: risk.riskTimeInMinutes,
        rpi: Number(rpi.toFixed(2))
      };
    });

    // Sort based on selected criteria
    const sortedData = [...riskDataWithRPI].sort((a, b) => {
      switch (sortRisksBy) {
        case 'rpi':
          return b.rpi - a.rpi;
        case 'probability':
          return b.probValue - a.probValue;
        case 'impact':
          return b.impactValue - a.impactValue;
        case 'time':
          return b.riskTimeInMinutes - a.riskTimeInMinutes;
        default:
          return 0;
      }
    });

    // Create matrix: risk levels as keys
    const matrix: Record<string, Record<string, typeof riskDataWithRPI>> = {
      'High': { 'High': [], 'Medium': [], 'Low': [] },
      'Medium': { 'High': [], 'Medium': [], 'Low': [] },
      'Low': { 'High': [], 'Medium': [], 'Low': [] }
    };

    riskDataWithRPI.forEach(risk => {
      matrix[risk.probability][risk.impactSeverity].push(risk);
    });

    return { riskDataWithRPI, sortedData, matrix };
  }, [risks, sortRisksBy]);

  const getRPIColor = (rpi: number): string => {
    if (rpi >= 6) return "hsl(var(--destructive))"; // Critical: Red
    if (rpi >= 4) return "hsl(var(--accent))"; // High: Orange
    if (rpi >= 2) return "hsl(120, 84%, 60%)"; // Medium: Yellow-green
    return "hsl(120, 73%, 75%)"; // Low: Green
  };

  const getSortButtonLabel = (sortBy: 'rpi' | 'probability' | 'impact' | 'time'): string => {
    switch (sortBy) {
      case 'rpi':
        return 'Risk Priority Index';
      case 'probability':
        return 'Probability';
      case 'impact':
        return 'Impact';
      case 'time':
        return 'Time Impact';
      default:
        return '';
    }
  };

  const renderPieChartLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any): React.ReactNode => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (percent * 100) > 5 ? (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    ) : null;
  };

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
                        label={renderPieChartLabel}
                    >
                       {categoryTimeData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
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
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center">
                <AlertTriangleIcon className="mr-2 h-5 w-5 text-primary" />
                Risk Matrix (Probability × Impact)
              </CardTitle>
              <CardDescription>Traditional risk matrix showing risks by probability and impact severity. Cell colors indicate Risk Priority Index (RPI).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-border p-2 bg-muted text-left font-semibold">Probability →</th>
                      <th className="border border-border p-2 bg-muted text-center font-semibold" style={{color: 'hsl(var(--destructive))'}}>High Impact</th>
                      <th className="border border-border p-2 bg-muted text-center font-semibold" style={{color: 'hsl(var(--accent))'}}>Medium Impact</th>
                      <th className="border border-border p-2 bg-muted text-center font-semibold" style={{color: 'hsl(120, 73%, 75%)'}}>Low Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['High', 'Medium', 'Low'].map((probLevel) => (
                      <tr key={probLevel}>
                        <td className="border border-border p-2 bg-muted font-semibold">{probLevel}</td>
                        {['High', 'Medium', 'Low'].map((impactLevel) => {
                          const cellRisks = riskMatrixData.matrix[probLevel][impactLevel];
                          const avgRPI = cellRisks.length > 0 
                            ? cellRisks.reduce((sum, r) => sum + r.rpi, 0) / cellRisks.length 
                            : 0;
                          const cellColor = getRPIColor(avgRPI);
                          
                          return (
                            <td 
                              key={`${probLevel}-${impactLevel}`}
                              className="border border-border p-3 text-white align-top"
                              style={{ backgroundColor: cellColor, minHeight: '100px' }}
                            >
                              <div className="space-y-1">
                                {cellRisks.map((risk) => (
                                  <div key={risk.id} className="text-xs font-medium truncate" title={risk.description}>
                                    {risk.description.length > 20 ? risk.description.substring(0, 17) + '...' : risk.description}
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-4 flex-wrap text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{backgroundColor: 'hsl(var(--destructive))'}}></div>
                  <span>Critical (RPI ≥ 6)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{backgroundColor: 'hsl(var(--accent))'}}></div>
                  <span>High (RPI 4-6)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{backgroundColor: 'hsl(120, 84%, 60%)'}}></div>
                  <span>Medium (RPI 2-4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{backgroundColor: 'hsl(120, 73%, 75%)'}}></div>
                  <span>Low (RPI &lt; 2)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center">
                <AlertTriangleIcon className="mr-2 h-5 w-5 text-primary" />
                Risk Priority Index (RPI) Analysis
              </CardTitle>
              <CardDescription>Detailed risk breakdown sorted by Risk Priority Index (Probability × Impact × Urgency).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4 flex-wrap">
                {(['rpi', 'probability', 'impact', 'time'] as const).map(sortBy => (
                  <button
                    key={sortBy}
                    onClick={() => setSortRisksBy(sortBy)}
                    className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 transition-colors ${
                      sortRisksBy === sortBy
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {getSortButtonLabel(sortBy)}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Risk Description</TableHead>
                      <TableHead className="text-center font-semibold">RPI</TableHead>
                      <TableHead className="text-center font-semibold">Probability</TableHead>
                      <TableHead className="text-center font-semibold">Impact</TableHead>
                      <TableHead className="text-right font-semibold">Time Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskMatrixData.sortedData.map((risk) => (
                      <TableRow key={risk.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{risk.description}</TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            className="font-bold" 
                            style={{
                              backgroundColor: getRPIColor(risk.rpi),
                              color: 'white',
                              border: 'none'
                            }}
                          >
                            {risk.rpi}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{risk.probability}</TableCell>
                        <TableCell className="text-center">{risk.impactSeverity}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatTime(new Decimal(risk.riskTimeInMinutes))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
