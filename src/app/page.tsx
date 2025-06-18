
"use client";

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import RequirementsSection from '@/components/RequirementsSection';
import ModulesSection from '@/components/ModulesSection';
import ProjectSettingsSection from '@/components/ProjectSettingsSection';
import AnalyticsSection from '@/components/AnalyticsSection'; 
import ProjectsDialog from '@/components/ProjectsDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, LayoutGrid, Settings, AreaChart } from 'lucide-react';
import type { Module, Risk, Project, ProjectData, Task, RiskLevel } from '@/types';
import { Decimal } from 'decimal.js';
import { useToast } from '@/hooks/use-toast';

const SAVED_PROJECTS_KEY = "codecraftEstimatorSavedProjects";
const CURRENT_PROJECT_ID_KEY = "codecraftEstimatorCurrentProjectId_v2"; 

const REQ_DOC_KEY = 'requirementsDocument';
const MODULES_KEY = 'modules';
const RISKS_KEY = 'risks';
const MULTIPLIER_KEY = 'effortMultiplier';
const RATE_KEY = 'hourlyRate';


export default function CodeCraftEstimatorPage() {
  const [requirementsDocument, setRequirementsDocument] = useState<string>('');
  const [modules, setModules] = useState<Module[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [effortMultiplier, setEffortMultiplier] = useState<number>(1.0);
  const [hourlyRate, setHourlyRate] = useState<number>(50);
  const [totalBaseTimeInMinutes, setTotalBaseTimeInMinutes] = useState<Decimal>(new Decimal(0));
  const [totalTasksTimeInMinutes, setTotalTasksTimeInMinutes] = useState<Decimal>(new Decimal(0));

  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState<boolean>(false);

  const { toast } = useToast();

  const validateAndUpgradeRisks = (risksArray: any[]): Risk[] => {
    return risksArray.map(risk => ({
      ...risk,
      id: risk.id || crypto.randomUUID(),
      probability: risk.probability || 'Medium', // Default if missing
      impactSeverity: risk.impactSeverity || 'Medium', // Default if missing
      riskTimeInMinutes: typeof risk.riskTimeInMinutes === 'string' ? parseFloat(risk.riskTimeInMinutes) : risk.riskTimeInMinutes,
    }));
  };

  useEffect(() => {
    const projectsFromStorage = localStorage.getItem(SAVED_PROJECTS_KEY);
    if (projectsFromStorage) {
      const parsedProjects = JSON.parse(projectsFromStorage) as Project[];
      const upgradedProjects = parsedProjects.map(p => ({
        ...p,
        risks: validateAndUpgradeRisks(p.risks || []),
      }));
      setSavedProjects(upgradedProjects);
    }

    const activeProjectId = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
    if (activeProjectId) {
      const projects = projectsFromStorage ? JSON.parse(projectsFromStorage) as Project[] : [];
      const projectToLoad = projects.find((p: Project) => p.id === activeProjectId);
      if (projectToLoad) {
        loadProjectDataIntoState(projectToLoad);
        setCurrentProjectId(projectToLoad.id);
        setCurrentProjectName(projectToLoad.name);
      } else {
        loadWorkspaceData();
        setCurrentProjectId(null); 
        setCurrentProjectName(null);
        localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
      }
    } else {
      loadWorkspaceData();
    }
  }, []);

  const loadWorkspaceData = () => {
    const savedReqDoc = localStorage.getItem(REQ_DOC_KEY);
    if (savedReqDoc) setRequirementsDocument(JSON.parse(savedReqDoc));

    const savedModules = localStorage.getItem(MODULES_KEY);
    if (savedModules) {
        const parsedModules = JSON.parse(savedModules) as Module[];
        parsedModules.forEach(module => {
            module.tasks.forEach(task => {
                if (typeof task.weightedAverageTimeInMinutes !== 'number') {
                    task.weightedAverageTimeInMinutes = parseFloat(String(task.weightedAverageTimeInMinutes));
                }
            });
        });
        setModules(parsedModules);
    }
    
    const savedRisksData = localStorage.getItem(RISKS_KEY);
     if (savedRisksData) {
        const parsedRisks = JSON.parse(savedRisksData) as any[]; // Load as any first
        setRisks(validateAndUpgradeRisks(parsedRisks));
    }

    const savedMultiplier = localStorage.getItem(MULTIPLIER_KEY);
    if (savedMultiplier) setEffortMultiplier(JSON.parse(savedMultiplier));

    const savedRate = localStorage.getItem(RATE_KEY);
    if (savedRate) setHourlyRate(JSON.parse(savedRate));
  };

  useEffect(() => { if (!currentProjectId) localStorage.setItem(REQ_DOC_KEY, JSON.stringify(requirementsDocument)); }, [requirementsDocument, currentProjectId]);
  useEffect(() => { if (!currentProjectId) localStorage.setItem(MODULES_KEY, JSON.stringify(modules)); }, [modules, currentProjectId]);
  useEffect(() => { if (!currentProjectId) localStorage.setItem(RISKS_KEY, JSON.stringify(risks)); }, [risks, currentProjectId]);
  useEffect(() => { if (!currentProjectId) localStorage.setItem(MULTIPLIER_KEY, JSON.stringify(effortMultiplier)); }, [effortMultiplier, currentProjectId]);
  useEffect(() => { if (!currentProjectId) localStorage.setItem(RATE_KEY, JSON.stringify(hourlyRate)); }, [hourlyRate, currentProjectId]);


  useEffect(() => {
    let taskTotal = new Decimal(0);
    modules.forEach(module => {
      module.tasks.forEach(task => {
        taskTotal = taskTotal.plus(new Decimal(task.weightedAverageTimeInMinutes));
      });
    });
    setTotalTasksTimeInMinutes(taskTotal);
  
    let riskTotal = new Decimal(0);
    risks.forEach(risk => {
      riskTotal = riskTotal.plus(new Decimal(risk.riskTimeInMinutes));
    });
    
    setTotalBaseTimeInMinutes(taskTotal.plus(riskTotal));
  }, [modules, risks]);


  const loadProjectDataIntoState = (projectData: ProjectData) => {
    setRequirementsDocument(projectData.requirementsDocument);
    setModules(projectData.modules.map(m => ({...m, tasks: m.tasks.map(t => ({...t, weightedAverageTimeInMinutes: Number(t.weightedAverageTimeInMinutes)}))})));
    setRisks(validateAndUpgradeRisks(projectData.risks));
    setEffortMultiplier(projectData.effortMultiplier);
    setHourlyRate(projectData.hourlyRate);
  };

  const handleSaveCurrentProject = useCallback((name: string) => {
    const now = new Date().toISOString();
    
    const totalAdjustedTime = totalBaseTimeInMinutes.times(new Decimal(effortMultiplier));
    const cost = hourlyRate > 0 ? totalAdjustedTime.dividedBy(60).times(new Decimal(hourlyRate)) : new Decimal(0);

    const projectDataToSave: ProjectData = {
      requirementsDocument,
      modules,
      risks: validateAndUpgradeRisks(risks), // Ensure risks are in the latest format
      effortMultiplier,
      hourlyRate,
      totalBaseTimeInMinutes: totalBaseTimeInMinutes.toString(),
      totalAdjustedTimeInMinutes: totalAdjustedTime.toString(),
      totalProjectCost: cost.toString(),
    };

    let newSavedProjects: Project[];
    let newCurrentProjectId = currentProjectId;
    let newCurrentProjectName = name;

    if (currentProjectId) { 
      const projectIndex = savedProjects.findIndex(p => p.id === currentProjectId);
      if (projectIndex > -1) {
        const updatedProject = { ...savedProjects[projectIndex], ...projectDataToSave, name, updatedAt: now };
        newSavedProjects = [...savedProjects];
        newSavedProjects[projectIndex] = updatedProject;
        toast({ title: "Project Updated", description: `Project "${name}" has been updated.` });
      } else { 
        newCurrentProjectId = crypto.randomUUID();
        const newProject: Project = { ...projectDataToSave, id: newCurrentProjectId, name, createdAt: now, updatedAt: now };
        newSavedProjects = [...savedProjects, newProject];
        toast({ title: "Project Saved", description: `Project "${name}" has been saved as a new project (original ID not found).` });
      }
    } else { 
      newCurrentProjectId = crypto.randomUUID();
      const newProject: Project = { ...projectDataToSave, id: newCurrentProjectId, name, createdAt: now, updatedAt: now };
      newSavedProjects = [...savedProjects, newProject];
      toast({ title: "Project Saved", description: `Project "${name}" has been saved.` });
    }
    
    setSavedProjects(newSavedProjects);
    localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(newSavedProjects));
    setCurrentProjectId(newCurrentProjectId);
    setCurrentProjectName(newCurrentProjectName);
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, newCurrentProjectId as string);
    setIsProjectsDialogOpen(false);
  }, [requirementsDocument, modules, risks, effortMultiplier, hourlyRate, totalBaseTimeInMinutes, savedProjects, currentProjectId, toast]);

  const handleLoadProject = useCallback((projectId: string) => {
    const projectToLoad = savedProjects.find(p => p.id === projectId);
    if (projectToLoad) {
      loadProjectDataIntoState(projectToLoad);
      setCurrentProjectId(projectToLoad.id);
      setCurrentProjectName(projectToLoad.name);
      localStorage.setItem(CURRENT_PROJECT_ID_KEY, projectToLoad.id);
      toast({ title: "Project Loaded", description: `Project "${projectToLoad.name}" has been loaded.` });
      setIsProjectsDialogOpen(false);
    } else {
      toast({ title: "Error Loading Project", description: "Could not find the selected project.", variant: "destructive" });
    }
  }, [savedProjects, toast]);

  const handleNewProject = useCallback(() => {
    setRequirementsDocument('');
    setModules([]);
    setRisks([]);
    setEffortMultiplier(1.0);
    setHourlyRate(50);
    setCurrentProjectId(null);
    setCurrentProjectName(null);
    localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
    
    localStorage.removeItem(REQ_DOC_KEY);
    localStorage.removeItem(MODULES_KEY);
    localStorage.removeItem(RISKS_KEY);
    localStorage.removeItem(MULTIPLIER_KEY);
    localStorage.removeItem(RATE_KEY);

    toast({ title: "New Project Started", description: "Workspace has been cleared." });
    setIsProjectsDialogOpen(false);
  }, [toast]);

  const handleDeleteProject = useCallback((projectId: string) => {
    const projectToDelete = savedProjects.find(p => p.id === projectId);
    if (!projectToDelete) return;

    const newSavedProjects = savedProjects.filter(p => p.id !== projectId);
    setSavedProjects(newSavedProjects);
    localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(newSavedProjects));
    toast({ title: "Project Deleted", description: `Project "${projectToDelete.name}" has been deleted.` });

    if (currentProjectId === projectId) {
      handleNewProject(); 
    }
  }, [savedProjects, currentProjectId, toast, handleNewProject]);

  const handleImportProjectFromFile = useCallback((fileContent: string) => {
    try {
      const importedRaw = JSON.parse(fileContent);

      if (
        typeof importedRaw.requirementsDocument !== 'string' ||
        !Array.isArray(importedRaw.modules) ||
        !Array.isArray(importedRaw.risks) ||
        typeof importedRaw.effortMultiplier !== 'number' ||
        typeof importedRaw.hourlyRate !== 'number'
      ) {
        toast({ title: "Invalid Project File", description: "The file is not a valid CodeCraft project.", variant: "destructive" });
        return;
      }
  
      const importedData = importedRaw as Partial<ProjectData & { name?: string, id?: string, createdAt?: string, updatedAt?: string }>;
  
      const validatedModules: Module[] = (importedData.modules || []).map((m: any) => ({
        id: m.id || crypto.randomUUID(),
        name: m.name || "Untitled Module",
        tasks: (m.tasks || []).map((t: any) => ({
          id: t.id || crypto.randomUUID(),
          description: t.description || "Untitled Task",
          optimisticTime: Number(t.optimisticTime || 0),
          mostLikelyTime: Number(t.mostLikelyTime || 0),
          pessimisticTime: Number(t.pessimisticTime || 0),
          timeUnit: t.timeUnit || 'hours',
          weightedAverageTimeInMinutes: Number(t.weightedAverageTimeInMinutes || 0),
        } as Task)),
      }));
      
      // Use the validation/upgrade function for risks
      const validatedRisks: Risk[] = validateAndUpgradeRisks(importedData.risks || []);


      const newProject: Project = {
        id: crypto.randomUUID(), 
        name: importedData.name || `Imported Project - ${new Date().toLocaleDateString()}`,
        requirementsDocument: importedData.requirementsDocument as string,
        modules: validatedModules,
        risks: validatedRisks,
        effortMultiplier: importedData.effortMultiplier as number,
        hourlyRate: importedData.hourlyRate as number,
        totalBaseTimeInMinutes: String(importedData.totalBaseTimeInMinutes || '0'),
        totalAdjustedTimeInMinutes: String(importedData.totalAdjustedTimeInMinutes || '0'),
        totalProjectCost: String(importedData.totalProjectCost || '0'),
        createdAt: importedData.createdAt && !isNaN(new Date(importedData.createdAt).getTime()) ? importedData.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
  
      const newSavedProjects = [...savedProjects, newProject];
      setSavedProjects(newSavedProjects);
      localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(newSavedProjects));
      toast({ title: "Project Imported", description: `Project "${newProject.name}" added. You can load it now.` });
      setIsProjectsDialogOpen(true);
    } catch (error) {
      console.error("Error importing project:", error);
      toast({ title: "Import Error", description: "Could not parse or import. Ensure it's valid JSON.", variant: "destructive" });
    }
  }, [savedProjects, toast]);
  
  const getCurrentProjectDataForDialog = (): ProjectData | null => {
    if (!currentProjectId && !requirementsDocument && modules.length === 0 && risks.length === 0) {
        return null;
    }
    const totalAdjustedTime = totalBaseTimeInMinutes.times(new Decimal(effortMultiplier));
    const cost = hourlyRate > 0 ? totalAdjustedTime.dividedBy(60).times(new Decimal(hourlyRate)) : new Decimal(0);

    return {
        requirementsDocument,
        modules,
        risks: validateAndUpgradeRisks(risks), // Ensure risks are current
        effortMultiplier,
        hourlyRate,
        totalBaseTimeInMinutes: totalBaseTimeInMinutes.toString(),
        totalAdjustedTimeInMinutes: totalAdjustedTime.toString(),
        totalProjectCost: cost.toString(),
    };
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header 
        currentProjectName={currentProjectName}
        onOpenProjectsDialog={() => setIsProjectsDialogOpen(true)}
      />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Tabs defaultValue="requirements" className="w-full">
          <TabsList className="grid w-full h-auto grid-cols-1 sm:grid-cols-4 mb-6 bg-card shadow-sm">
            <TabsTrigger value="requirements" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <Lightbulb className="mr-2 h-5 w-5" /> Requirements AI
            </TabsTrigger>
            <TabsTrigger value="modules" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <LayoutGrid className="mr-2 h-5 w-5" /> Modules & Tasks
            </TabsTrigger>
            <TabsTrigger value="settings" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <Settings className="mr-2 h-5 w-5" /> Settings & Cost
            </TabsTrigger>
            <TabsTrigger value="analytics" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <AreaChart className="mr-2 h-5 w-5" /> Analytics
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
              projectData={getCurrentProjectDataForDialog()} 
              modules={modules} 
              risks={risks} 
              setRisks={setRisks} 
              effortMultiplier={effortMultiplier}
              setEffortMultiplier={setEffortMultiplier}
              hourlyRate={hourlyRate}
              setHourlyRate={setHourlyRate}
              totalBaseTimeInMinutes={totalBaseTimeInMinutes}
              totalTasksTimeInMinutes={totalTasksTimeInMinutes}
            />
          </TabsContent>
           <TabsContent value="analytics">
            <AnalyticsSection
              modules={modules}
              risks={risks}
              effortMultiplier={effortMultiplier}
            />
          </TabsContent>
        </Tabs>
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border">
        CodeCraft Estimator &copy; {new Date().getFullYear()}
      </footer>
      <ProjectsDialog
        isOpen={isProjectsDialogOpen}
        onOpenChange={setIsProjectsDialogOpen}
        projects={savedProjects}
        currentProjectId={currentProjectId}
        currentProjectName={currentProjectName}
        currentProjectData={getCurrentProjectDataForDialog()}
        onLoadProject={handleLoadProject}
        onSaveProject={handleSaveCurrentProject}
        onNewProject={handleNewProject}
        onDeleteProject={handleDeleteProject}
        onImportProject={handleImportProjectFromFile}
      />
    </div>
  );
}
