
"use client";

import type * as React from 'react';
import { useState } from 'react';
import type { Module, Risk, TimeUnit, ProjectData, RiskLevel } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Slider } from "@/components/ui/slider"
import { ShieldAlert, CircleDollarSign, PlusCircle, Trash2, TrendingUp, Download } from 'lucide-react';
import { convertToMinutes, formatTime } from '@/lib/timeUtils';
import { useToast } from '@/hooks/use-toast';
import { Decimal } from 'decimal.js';

interface ProjectSettingsSectionProps {
  projectData: ProjectData | null;
  modules: Module[];
  risks: Risk[];
  setRisks: React.Dispatch<React.SetStateAction<Risk[]>>;
  effortMultiplier: number;
  setEffortMultiplier: (value: number) => void;
  hourlyRate: number;
  setHourlyRate: (value: number) => void;
  totalBaseTimeInMinutes: Decimal;
}

export default function ProjectSettingsSection({
  projectData,
  modules,
  risks,
  setRisks,
  effortMultiplier,
  setEffortMultiplier,
  hourlyRate,
  setHourlyRate,
  totalBaseTimeInMinutes
}: ProjectSettingsSectionProps) {
  const [newRisk, setNewRisk] = useState<Partial<Omit<Risk, 'id' | 'riskTimeInMinutes'>> & { timeEstimate?: number, timeUnit?: TimeUnit }>({ probability: 'Medium', impactSeverity: 'Medium' });
  const { toast } = useToast();

  const handleAddRisk = () => {
    if (!newRisk.description?.trim() || newRisk.timeEstimate == null || !newRisk.timeUnit || !newRisk.probability || !newRisk.impactSeverity) {
      toast({ title: "Incomplete risk details", description: "Please fill all risk fields, including probability and impact.", variant: "destructive" });
      return;
    }
    const riskTimeInMinutesDecimal = convertToMinutes(newRisk.timeEstimate, newRisk.timeUnit);
    const riskToAdd: Risk = {
      id: crypto.randomUUID(),
      description: newRisk.description,
      timeEstimate: newRisk.timeEstimate,
      timeUnit: newRisk.timeUnit,
      riskTimeInMinutes: riskTimeInMinutesDecimal.toNumber(),
      probability: newRisk.probability,
      impactSeverity: newRisk.impactSeverity,
    };
    setRisks(prev => [...prev, riskToAdd]);
    setNewRisk({ probability: 'Medium', impactSeverity: 'Medium' }); // Reset with defaults
  };

  const handleDeleteRisk = (riskId: string) => {
    setRisks(prev => prev.filter(r => r.id !== riskId));
  };

  const totalBaseTimeDecimal = new Decimal(totalBaseTimeInMinutes);
  const effortMultiplierDecimal = new Decimal(effortMultiplier);
  const hourlyRateDecimal = new Decimal(hourlyRate);

  const totalAdjustedTimeInMinutes = totalBaseTimeDecimal.times(effortMultiplierDecimal);
  let totalProjectCost = new Decimal(0);
  if (hourlyRateDecimal.greaterThan(0)) {
    totalProjectCost = totalAdjustedTimeInMinutes.dividedBy(60).times(hourlyRateDecimal);
  }

  const handleExportProject = () => {
    if (!projectData) {
       toast({
        title: "No Project Data",
        description: "There is no current project data to export.",
        variant: "destructive",
      });
      return;
    }
    
    const exportableProjectData = {
      ...projectData,
      projectSummary: {
        totalBaseTimeInMinutes: totalBaseTimeDecimal.toString(),
        totalBaseTimeFormatted: formatTime(totalBaseTimeDecimal),
        totalAdjustedTimeInMinutes: totalAdjustedTimeInMinutes.toString(),
        totalAdjustedTimeFormatted: formatTime(totalAdjustedTimeInMinutes),
        totalProjectCost: totalProjectCost.toString(),
        totalProjectCostFormatted: `$${totalProjectCost.toFixed(2)}`
      },
    };

    try {
      const jsonString = JSON.stringify(exportableProjectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'codecraft-project-export.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Project Exported",
        description: "Your project data has been downloaded as a JSON file.",
      });
    } catch (error) {
      console.error("Error exporting project:", error);
      toast({
        title: "Error Exporting Project",
        description: "Could not export the project data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const riskLevels: RiskLevel[] = ['Low', 'Medium', 'High'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <ShieldAlert className="mr-2 h-6 w-6 text-primary" />
            Risk & Complexity Adjustment
          </CardTitle>
          <CardDescription>
            Account for potential project risks and overall complexity. Define risk probability and impact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 p-4 border border-border rounded-lg bg-secondary/30">
            <h3 className="font-headline text-lg">Add New Risk</h3>
            <Input 
              placeholder="Risk description (e.g., Third-party API integration delay)" 
              value={newRisk.description || ''} 
              onChange={(e) => setNewRisk(prev => ({ ...prev, description: e.target.value }))} 
              className="focus:ring-accent"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input 
                type="number" 
                placeholder="Time Est." 
                value={newRisk.timeEstimate || ''} 
                onChange={(e) => setNewRisk(prev => ({ ...prev, timeEstimate: Number(e.target.value) }))} 
                className="focus:ring-accent"
                min="0"
              />
              <Select onValueChange={(val) => setNewRisk(prev => ({ ...prev, timeUnit: val as TimeUnit }))} value={newRisk.timeUnit || ''}>
                <SelectTrigger className="focus:ring-accent"><SelectValue placeholder="Time Unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-2 gap-2">
              <Select onValueChange={(val) => setNewRisk(prev => ({ ...prev, probability: val as RiskLevel }))} value={newRisk.probability || 'Medium'}>
                <SelectTrigger className="focus:ring-accent"><SelectValue placeholder="Probability" /></SelectTrigger>
                <SelectContent>
                  {riskLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select onValueChange={(val) => setNewRisk(prev => ({ ...prev, impactSeverity: val as RiskLevel }))} value={newRisk.impactSeverity || 'Medium'}>
                <SelectTrigger className="focus:ring-accent"><SelectValue placeholder="Impact" /></SelectTrigger>
                <SelectContent>
                  {riskLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddRisk} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Risk
            </Button>
          </div>

          {risks.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-headline text-lg">Identified Risks:</h3>
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {risks.map(risk => (
                  <li key={risk.id} className="p-3 border border-border rounded-md bg-background shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-medium text-foreground">{risk.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Impact Time: {formatTime(risk.riskTimeInMinutes)} | P: {risk.probability} | I: {risk.impactSeverity}
                      </p>
                    </div>
                    <Button onClick={() => handleDeleteRisk(risk.id)} variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {risks.length === 0 && <p className="text-muted-foreground text-sm">No risks added yet.</p>}
          
          <div className="space-y-2 pt-4">
            <Label htmlFor="effort-multiplier" className="font-headline text-lg">Overall Effort Multiplier: {effortMultiplier.toFixed(1)}x</Label>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <Slider
                id="effort-multiplier"
                min={0.5}
                max={2.5}
                step={0.1}
                defaultValue={[effortMultiplier]}
                onValueChange={(value) => setEffortMultiplier(value[0])}
                className="w-full [&>span:first-child]:h-2 [&>span:first-child>span]:bg-accent [&>span:last-child]:bg-primary [&>span:last-child]:border-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground">Adjust for factors like security, deployment complexity, team experience, etc. (e.g., 1.0 = Normal, 1.5 = High Complexity).</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <CircleDollarSign className="mr-2 h-6 w-6 text-primary" />
            Cost Estimation
          </CardTitle>
          <CardDescription>
            Define your hourly rate to see the estimated project cost.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hourly-rate" className="font-headline text-lg">Hourly Rate ($)</Label>
            <Input
              id="hourly-rate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))}
              placeholder="e.g., 75"
              className="focus:ring-accent mt-1"
              min="0"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start space-y-3 bg-secondary/30 p-4 rounded-b-lg">
          <div className="w-full">
            <p className="text-sm text-muted-foreground">Base Estimated Time (Tasks + Risks):</p>
            <p className="font-headline text-xl text-primary">{formatTime(totalBaseTimeDecimal)}</p>
          </div>
          <div className="w-full">
            <p className="text-sm text-muted-foreground">Total Adjusted Estimated Time (Factoring Multiplier):</p>
            <p className="font-headline text-xl text-primary">{formatTime(totalAdjustedTimeInMinutes)}</p>
          </div>
          <div className="w-full pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">Estimated Project Cost:</p>
            <p className="font-headline text-3xl text-accent">
              ${totalProjectCost.toFixed(2)}
            </p>
          </div>
          <div className="w-full pt-4 mt-4 border-t border-border">
            <Button onClick={handleExportProject} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Download className="mr-2 h-5 w-5" /> Export Current Project (JSON)
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">This will download a JSON file containing the current project data.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
