
"use client";

import type * as React from 'react';
import { useState, useRef, useMemo } from 'react';
import type { Module, Risk, TimeUnit, ProjectData, RiskLevel, TaskCategory } from '@/types';
import { TASK_CATEGORIES } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Slider } from "@/components/ui/slider"
import { ShieldAlert, CircleDollarSign, PlusCircle, Trash2, TrendingUp, Download, Brain, Loader2, ListChecks, Layers } from 'lucide-react';
import { convertToMinutes, formatTime } from '@/lib/timeUtils';
import { useToast } from '@/hooks/use-toast';
import { Decimal } from 'decimal.js';
import { suggestRisks, type SuggestRisksOutput } from '@/ai/flows/suggest-risks';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectSettingsSectionProps {
  projectData: ProjectData | null;
  requirementsDocument: string;
  modules: Module[];
  risks: Risk[];
  setRisks: React.Dispatch<React.SetStateAction<Risk[]>>;
  effortMultiplier: number;
  setEffortMultiplier: (value: number) => void;
  hourlyRate: number;
  setHourlyRate: (value: number) => void;
  fixedCosts: string;
  setFixedCosts: (value: string) => void;
  totalBaseTimeInMinutes: Decimal;
  totalTasksTimeInMinutes: Decimal;
}

export default function ProjectSettingsSection({
  projectData,
  requirementsDocument,
  modules,
  risks,
  setRisks,
  effortMultiplier,
  setEffortMultiplier,
  hourlyRate,
  setHourlyRate,
  fixedCosts,
  setFixedCosts,
  totalBaseTimeInMinutes,
  totalTasksTimeInMinutes
}: ProjectSettingsSectionProps) {
  const [newRisk, setNewRisk] = useState<Partial<Omit<Risk, 'id' | 'riskTimeInMinutes'>> & { timeEstimate?: number, timeUnit?: TimeUnit }>({ probability: 'Medium', impactSeverity: 'Medium' });
  const [isSuggestingRisks, setIsSuggestingRisks] = useState(false);
  const [aiSuggestedRiskDescriptions, setAiSuggestedRiskDescriptions] = useState<string[]>([]);
  const { toast } = useToast();
  const newRiskDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const newRiskTimeEstimateRef = useRef<HTMLInputElement>(null);


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
    setNewRisk({ probability: 'Medium', impactSeverity: 'Medium', description: '', timeEstimate: undefined, timeUnit: undefined }); // Reset with defaults and clear fields
  };

  const handleDeleteRisk = (riskId: string) => {
    setRisks(prev => prev.filter(r => r.id !== riskId));
  };

  const handleSuggestRisks = async () => {
    if (!requirementsDocument.trim()) {
      toast({ title: "Project Description Empty", description: "Please generate or enter a requirements document/project description first.", variant: "destructive" });
      return;
    }
    setIsSuggestingRisks(true);
    setAiSuggestedRiskDescriptions([]);
    try {
      const result: SuggestRisksOutput = await suggestRisks({ projectDescription: requirementsDocument });
      if (result.suggestedRisks && result.suggestedRisks.length > 0) {
        setAiSuggestedRiskDescriptions(result.suggestedRisks);
        toast({ title: "AI Risk Suggestions", description: "AI has suggested potential risks. Click a suggestion to pre-fill the risk description." });
      } else {
        toast({ title: "No Risks Suggested", description: "AI did not find any specific risks to suggest based on the description." });
      }
    } catch (error) {
      console.error("Error suggesting risks:", error);
      toast({ title: "AI Error", description: "Failed to get risk suggestions from AI.", variant: "destructive" });
    } finally {
      setIsSuggestingRisks(false);
    }
  };

  const handleSelectSuggestedRisk = (description: string) => {
    setNewRisk(prev => ({ ...prev, description }));
    // Scroll to the new risk section and focus the description input
    if (newRiskDescriptionRef.current) {
        newRiskDescriptionRef.current.focus();
        newRiskDescriptionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (newRiskTimeEstimateRef.current) {
        newRiskTimeEstimateRef.current.focus();
        newRiskTimeEstimateRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };


  const totalBaseTimeDecimal = new Decimal(totalBaseTimeInMinutes);
  const effortMultiplierDecimal = new Decimal(effortMultiplier);
  const hourlyRateDecimal = new Decimal(hourlyRate);
  const fixedCostsDecimal = new Decimal(fixedCosts || '0');

  const totalAdjustedTimeInMinutes = totalBaseTimeDecimal.times(effortMultiplierDecimal);
  let costFromTime = new Decimal(0);
  if (hourlyRateDecimal.greaterThan(0)) {
    costFromTime = totalAdjustedTimeInMinutes.dividedBy(60).times(hourlyRateDecimal);
  }
  const totalProjectCost = costFromTime.plus(fixedCostsDecimal);

  const timeByCategory = useMemo(() => {
    const categoryMap: { [key: string]: Decimal } = {};
    modules.forEach(module => {
      module.tasks.forEach(task => {
        const category = task.category || "Uncategorized";
        categoryMap[category] = (categoryMap[category] || new Decimal(0)).plus(task.weightedAverageTimeInMinutes);
      });
    });
    return Object.entries(categoryMap)
                 .map(([name, time]) => ({ name, time }))
                 .sort((a, b) => TASK_CATEGORIES.indexOf(a.name as TaskCategory) - TASK_CATEGORIES.indexOf(b.name as TaskCategory)); // Sort by predefined order
  }, [modules]);


  const handleExportProject = () => {
    if (!projectData) {
       toast({
        title: "No Project Data",
        description: "There is no current project data to export. Save the project first or add some data.",
        variant: "destructive",
      });
      return;
    }
    
    const exportableProjectData = {
      ...projectData,
      fixedCosts: fixedCostsDecimal.toString(), // Ensure fixedCosts is in the export
      projectSummary: {
        totalBaseTimeInMinutes: totalBaseTimeDecimal.toString(),
        totalBaseTimeFormatted: formatTime(totalBaseTimeDecimal),
        totalAdjustedTimeInMinutes: totalAdjustedTimeInMinutes.toString(),
        totalAdjustedTimeFormatted: formatTime(totalAdjustedTimeInMinutes),
        totalProjectCost: totalProjectCost.toString(),
        totalProjectCostFormatted: `$${totalProjectCost.toFixed(2)}`,
        fixedCosts: fixedCostsDecimal.toString(),
        fixedCostsFormatted: `$${fixedCostsDecimal.toFixed(2)}`,
        timeByCategory: timeByCategory.map(cat => ({ name: cat.name, time: cat.time.toString(), formattedTime: formatTime(cat.time) }))
      },
    };

    try {
      const jsonString = JSON.stringify(exportableProjectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const projectNameForFile = projectData.name || "codecraft-project";
      link.href = url; // Ensure the href is set to the blob URL
      link.download = `${projectNameForFile.toLowerCase().replace(/\s+/g, '-')}-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100); // Delay revoking the URL to ensure the download starts

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
           {/* AI Risk Suggestion */}
          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="text-md font-headline flex items-center"><Brain className="mr-2 h-5 w-5 text-primary/80"/>AI Risk Suggestions</CardTitle>
              <CardDescription className="text-xs">Let AI suggest potential risks based on the project description/requirements document.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleSuggestRisks} disabled={isSuggestingRisks || !requirementsDocument.trim()} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSuggestingRisks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                Suggest Risks with AI
              </Button>
              {aiSuggestedRiskDescriptions.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Click a suggestion to use it:</p>
                  <ScrollArea className="h-32 border rounded-md p-2 bg-background">
                    <ul className="space-y-1">
                      {aiSuggestedRiskDescriptions.map((desc, index) => (
                        <li key={index}>
                          <Button variant="link" size="sm" className="p-0 h-auto text-left text-accent hover:text-accent/80" onClick={() => handleSelectSuggestedRisk(desc)}>
                            {desc}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add New Risk Form */}
          <div id="add-new-risk-form" className="space-y-3 p-4 border border-border rounded-lg bg-secondary/30">
            <h3 className="font-headline text-lg flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary/80"/>Add New Risk</h3>
            <Textarea 
              ref={newRiskDescriptionRef}
              placeholder="Risk description (e.g., Third-party API integration delay)" 
              value={newRisk.description || ''} 
              onChange={(e) => setNewRisk(prev => ({ ...prev, description: e.target.value }))} 
              className="focus:ring-accent min-h-[60px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input 
                ref={newRiskTimeEstimateRef}
                type="number" 
                placeholder="Time Est." 
                value={newRisk.timeEstimate === undefined ? '' : newRisk.timeEstimate} 
                onChange={(e) => setNewRisk(prev => ({ ...prev, timeEstimate: e.target.value === '' ? undefined : Number(e.target.value) }))} 
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
                <div>
                    <Label htmlFor="risk-probability" className="text-xs">Probability</Label>
                    <Select onValueChange={(val) => setNewRisk(prev => ({ ...prev, probability: val as RiskLevel }))} value={newRisk.probability || 'Medium'}>
                        <SelectTrigger id="risk-probability" className="focus:ring-accent w-full"><SelectValue placeholder="Probability" /></SelectTrigger>
                        <SelectContent>
                        {riskLevels.map(level => <SelectItem key={`prob-${level}`} value={level}>{level}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="risk-impact" className="text-xs">Impact Severity</Label>
                    <Select onValueChange={(val) => setNewRisk(prev => ({ ...prev, impactSeverity: val as RiskLevel }))} value={newRisk.impactSeverity || 'Medium'}>
                        <SelectTrigger id="risk-impact" className="focus:ring-accent w-full"><SelectValue placeholder="Impact" /></SelectTrigger>
                        <SelectContent>
                        {riskLevels.map(level => <SelectItem key={`impact-${level}`} value={level}>{level}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Button onClick={handleAddRisk} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Risk
            </Button>
          </div>

          {risks.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-headline text-lg">Identified Risks:</h3>
              <ScrollArea className="max-h-60 pr-2 overflow-y-auto">
                <ul className="space-y-2">
                  {risks.map(risk => (
                    <li key={risk.id} className="p-3 border border-border rounded-md bg-background shadow-sm flex justify-between items-center">
                      <div>
                        <p className="font-medium text-foreground">{risk.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Impact: {formatTime(risk.riskTimeInMinutes)} | P: {risk.probability} | I: {risk.impactSeverity}
                        </p>
                      </div>
                      <Button onClick={() => handleDeleteRisk(risk.id)} variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
          {risks.length === 0 && aiSuggestedRiskDescriptions.length === 0 && <p className="text-muted-foreground text-sm text-center">No risks added yet. You can add them manually or use AI suggestions.</p>}
          
          <div className="space-y-2 pt-4">
            <Label htmlFor="effort-multiplier" className="font-headline text-lg">Overall Effort Multiplier: {effortMultiplier.toFixed(1)}x</Label>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <Slider
                id="effort-multiplier"
                min={0.5}
                max={2.5}
                step={0.1}
                value={[effortMultiplier]}
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
            Define your hourly rate and fixed costs to see the estimated project cost.
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
           <div>
            <Label htmlFor="fixed-costs" className="font-headline text-lg">Fixed Project Costs ($)</Label>
            <Input
              id="fixed-costs"
              type="number"
              value={fixedCosts === '0' && !fixedCosts.includes('.') ? '' : fixedCosts} // Show empty for '0' unless editing
              onChange={(e) => setFixedCosts(e.target.value === '' ? '0' : String(Math.max(0, Number(e.target.value))))}
              placeholder="e.g., 500 for software licenses"
              className="focus:ring-accent mt-1"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground mt-1">Enter any fixed costs associated with the project (e.g., licenses, hardware).</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start space-y-3 bg-secondary/30 p-4 rounded-b-lg">
          <div className="w-full">
            <p className="text-sm text-muted-foreground">First Estimated Time (Only Tasks):</p>
            <p className="font-headline text-xl text-primary">{formatTime(totalTasksTimeInMinutes)}</p>
          </div>
          <div className="w-full">
            <p className="text-sm text-muted-foreground">Base Estimated Time (Tasks + Risks):</p>
            <p className="font-headline text-xl text-primary">{formatTime(totalBaseTimeDecimal)}</p>
          </div>
          <div className="w-full">
            <p className="text-sm text-muted-foreground">Total Adjusted Estimated Time (Factoring Multiplier):</p>
            <p className="font-headline text-xl text-primary">{formatTime(totalAdjustedTimeInMinutes)}</p>
          </div>
           <div className="w-full">
            <p className="text-sm text-muted-foreground">Fixed Costs:</p>
            <p className="font-headline text-xl text-primary">${fixedCostsDecimal.toFixed(2)}</p>
          </div>
          <div className="w-full pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">Total Estimated Project Cost (Adjusted Time + Fixed Costs):</p>
            <p className="font-headline text-3xl text-accent">
              ${totalProjectCost.toFixed(2)}
            </p>
          </div>
          
          {timeByCategory.length > 0 && (
            <div className="w-full pt-3 mt-3 border-t border-border">
              <h4 className="font-headline text-lg flex items-center mb-2">
                <Layers className="mr-2 h-5 w-5 text-primary" />
                Time Breakdown by Category:
              </h4>
              <ul className="space-y-1 text-sm">
                {timeByCategory.map(cat => (
                  <li key={cat.name} className="flex justify-between">
                    <span className="text-muted-foreground">{cat.name}:</span>
                    <span className="font-medium text-foreground">{formatTime(cat.time)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="w-full pt-4 mt-4 border-t border-border">
            <Button onClick={handleExportProject} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={!projectData}>
              <Download className="mr-2 h-5 w-5" /> Export Current Project (JSON)
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">This will download a JSON file containing the current project data. Save the project first if it's new or has unsaved changes to include its name in the file.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
