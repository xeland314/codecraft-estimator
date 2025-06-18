
"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import RequirementsSection from '@/components/RequirementsSection';
import ModulesSection from '@/components/ModulesSection';
import ProjectSettingsSection from '@/components/ProjectSettingsSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, LayoutGrid, Settings } from 'lucide-react';
import type { Module, Risk } from '@/types';
import { Decimal } from 'decimal.js';

export default function CodeCraftEstimatorPage() {
  const [requirementsDocument, setRequirementsDocument] = useState<string>('');
  const [modules, setModules] = useState<Module[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [effortMultiplier, setEffortMultiplier] = useState<number>(1.0);
  const [hourlyRate, setHourlyRate] = useState<number>(50); // Default hourly rate

  const [totalBaseTimeInMinutes, setTotalBaseTimeInMinutes] = useState<Decimal>(new Decimal(0));

  // Effect to load data from localStorage on mount
  useEffect(() => {
    const savedReqDoc = localStorage.getItem('requirementsDocument');
    if (savedReqDoc) setRequirementsDocument(JSON.parse(savedReqDoc));

    const savedModules = localStorage.getItem('modules');
    if (savedModules) {
        const parsedModules = JSON.parse(savedModules) as Module[];
        // Ensure weightedAverageTimeInMinutes is number for consistency if loaded from old format
        parsedModules.forEach(module => {
            module.tasks.forEach(task => {
                if (typeof task.weightedAverageTimeInMinutes !== 'number') {
                    task.weightedAverageTimeInMinutes = parseFloat(String(task.weightedAverageTimeInMinutes));
                }
            });
        });
        setModules(parsedModules);
    }
    
    const savedRisks = localStorage.getItem('risks');
     if (savedRisks) {
        const parsedRisks = JSON.parse(savedRisks) as Risk[];
        parsedRisks.forEach(risk => {
            if (typeof risk.riskTimeInMinutes !== 'number') {
                risk.riskTimeInMinutes = parseFloat(String(risk.riskTimeInMinutes));
            }
        });
        setRisks(parsedRisks);
    }


    const savedMultiplier = localStorage.getItem('effortMultiplier');
    if (savedMultiplier) setEffortMultiplier(JSON.parse(savedMultiplier));

    const savedRate = localStorage.getItem('hourlyRate');
    if (savedRate) setHourlyRate(JSON.parse(savedRate));
  }, []);

  // Effect to save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('requirementsDocument', JSON.stringify(requirementsDocument));
  }, [requirementsDocument]);

  useEffect(() => {
    localStorage.setItem('modules', JSON.stringify(modules));
  }, [modules]);

  useEffect(() => {
    localStorage.setItem('risks', JSON.stringify(risks));
  }, [risks]);

  useEffect(() => {
    localStorage.setItem('effortMultiplier', JSON.stringify(effortMultiplier));
  }, [effortMultiplier]);

  useEffect(() => {
    localStorage.setItem('hourlyRate', JSON.stringify(hourlyRate));
  }, [hourlyRate]);


  useEffect(() => {
    let taskTotal = new Decimal(0);
    modules.forEach(module => {
        module.tasks.forEach(task => {
            taskTotal = taskTotal.plus(new Decimal(task.weightedAverageTimeInMinutes));
        });
    });

    let riskTotal = new Decimal(0);
    risks.forEach(risk => {
        riskTotal = riskTotal.plus(new Decimal(risk.riskTimeInMinutes));
    });
    
    setTotalBaseTimeInMinutes(taskTotal.plus(riskTotal));
  }, [modules, risks]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Tabs defaultValue="requirements" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6 bg-card shadow-sm">
            <TabsTrigger value="requirements" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <Lightbulb className="mr-2 h-5 w-5" /> Requirements AI
            </TabsTrigger>
            <TabsTrigger value="modules" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <LayoutGrid className="mr-2 h-5 w-5" /> Modules & Tasks
            </TabsTrigger>
            <TabsTrigger value="settings" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <Settings className="mr-2 h-5 w-5" /> Settings & Cost
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="requirements">
            <RequirementsSection 
              requirementsDocument={requirementsDocument}
              setRequirementsDocument={setRequirementsDocument}
              setModules={setModules}
            />
          </TabsContent>
          <TabsContent value="modules">
            <ModulesSection modules={modules} setModules={setModules} />
          </TabsContent>
          <TabsContent value="settings">
            <ProjectSettingsSection
              risks={risks}
              setRisks={setRisks}
              effortMultiplier={effortMultiplier}
              setEffortMultiplier={setEffortMultiplier}
              hourlyRate={hourlyRate}
              setHourlyRate={setHourlyRate}
              totalBaseTimeInMinutes={totalBaseTimeInMinutes}
            />
          </TabsContent>
        </Tabs>
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border">
        CodeCraft Estimator &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
