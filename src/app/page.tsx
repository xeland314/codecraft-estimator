
"use client";

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import RequirementsSection from '@/components/RequirementsSection';
import ModulesSection from '@/components/ModulesSection';
import ProjectSettingsSection from '@/components/ProjectSettingsSection';
import ProjectsDialog from '@/components/ProjectsDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, LayoutGrid, Settings } from 'lucide-react';
import type { Module, Risk, Project, ProjectData } from '@/types';
import { Decimal } from 'decimal.js';
import { useToast } from '@/hooks/use-toast';

const SAVED_PROJECTS_KEY = "codecraftEstimatorSavedProjects";
const CURRENT_PROJECT_ID_KEY = "codecraftEstimatorCurrentProjectId_v2"; // v2 to avoid conflicts with old single project save

// Keys for individual pieces of the current working project
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

  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState<boolean>(false);

  const { toast } = useToast();

  // Load saved projects list and current project ID from localStorage on mount
  useEffect(() => {
    const projectsFromStorage = localStorage.getItem(SAVED_PROJECTS_KEY);
    if (projectsFromStorage) {
      setSavedProjects(JSON.parse(projectsFromStorage));
    }

    const activeProjectId = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
    if (activeProjectId) {
      const projects = projectsFromStorage ? JSON.parse(projectsFromStorage) : [];
      const projectToLoad = projects.find((p: Project) => p.id === activeProjectId);
      if (projectToLoad) {
        loadProjectDataIntoState(projectToLoad);
        setCurrentProjectId(projectToLoad.id);
        setCurrentProjectName(projectToLoad.name);
      } else {
        // If current project ID exists but project not found, load default workspace
        loadWorkspaceData();
        setCurrentProjectId(null); // Clear invalid project ID
        setCurrentProjectName(null);
        localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
      }
    } else {
      // No active project ID, load default workspace data
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
        const parsedRisks = JSON.parse(savedRisksData) as Risk[];
        parsedRisks.forEach(risk => {
            if (typeof risk.riskTimeInMinutes !== 'number') {
                risk.riskTimeInMinutes = parseFloat(String(risk.riskTimeInMinutes));
            }
        });
        setRisks(parsedRisks);
    }

    const savedMultiplier = localStorage.getItem(MULTIPLIER_KEY);
    if (savedMultiplier) setEffortMultiplier(JSON.parse(savedMultiplier));

    const savedRate = localStorage.getItem(RATE_KEY);
    if (savedRate) setHourlyRate(JSON.parse(savedRate));
  };

  // Autosave current workspace (individual items)
  useEffect(() => { localStorage.setItem(REQ_DOC_KEY, JSON.stringify(requirementsDocument)); }, [requirementsDocument]);
  useEffect(() => { localStorage.setItem(MODULES_KEY, JSON.stringify(modules)); }, [modules]);
  useEffect(() => { localStorage.setItem(RISKS_KEY, JSON.stringify(risks)); }, [risks]);
  useEffect(() => { localStorage.setItem(MULTIPLIER_KEY, JSON.stringify(effortMultiplier)); }, [effortMultiplier]);
  useEffect(() => { localStorage.setItem(RATE_KEY, JSON.stringify(hourlyRate)); }, [hourlyRate]);


  // Calculate total base time
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


  const loadProjectDataIntoState = (projectData: ProjectData) => {
    setRequirementsDocument(projectData.requirementsDocument);
    setModules(projectData.modules.map(m => ({...m, tasks: m.tasks.map(t => ({...t, weightedAverageTimeInMinutes: Number(t.weightedAverageTimeInMinutes)}))})));
    setRisks(projectData.risks.map(r => ({...r, riskTimeInMinutes: Number(r.riskTimeInMinutes)})));
    setEffortMultiplier(projectData.effortMultiplier);
    setHourlyRate(projectData.hourlyRate);
    // totalBaseTimeInMinutes will be recalculated by its own useEffect when modules/risks change
  };

  const handleSaveCurrentProject = useCallback((name: string) => {
    const now = new Date().toISOString();
    
    const totalAdjustedTime = totalBaseTimeInMinutes.times(new Decimal(effortMultiplier));
    const cost = hourlyRate > 0 ? totalAdjustedTime.dividedBy(60).times(new Decimal(hourlyRate)) : new Decimal(0);

    const projectDataToSave: ProjectData = {
      requirementsDocument,
      modules,
      risks,
      effortMultiplier,
      hourlyRate,
      totalBaseTimeInMinutes: totalBaseTimeInMinutes.toString(),
      totalAdjustedTimeInMinutes: totalAdjustedTime.toString(),
      totalProjectCost: cost.toString(),
    };

    let newSavedProjects: Project[];
    let newCurrentProjectId = currentProjectId;
    let newCurrentProjectName = name;

    if (currentProjectId) { // Update existing project
      const projectIndex = savedProjects.findIndex(p => p.id === currentProjectId);
      if (projectIndex > -1) {
        const updatedProject = { ...savedProjects[projectIndex], ...projectDataToSave, name, updatedAt: now };
        newSavedProjects = [...savedProjects];
        newSavedProjects[projectIndex] = updatedProject;
        toast({ title: "Project Updated", description: `Project "${name}" has been updated.` });
      } else { // ID exists but not in list (edge case), save as new
        newCurrentProjectId = crypto.randomUUID();
        const newProject: Project = { ...projectDataToSave, id: newCurrentProjectId, name, createdAt: now, updatedAt: now };
        newSavedProjects = [...savedProjects, newProject];
        toast({ title: "Project Saved", description: `Project "${name}" has been saved.` });
      }
    } else { // Save as new project
      newCurrentProjectId = crypto.randomUUID();
      const newProject: Project = { ...projectDataToSave, id: newCurrentProjectId, name, createdAt: now, updatedAt: now };
      newSavedProjects = [...savedProjects, newProject];
      toast({ title: "Project Saved", description: `Project "${name}" has been saved.` });
    }
    
    setSavedProjects(newSavedProjects);
    localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(newSavedProjects));
    setCurrentProjectId(newCurrentProjectId);
    setCurrentProjectName(newCurrentProjectName);
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, newCurrentProjectId);
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
    // totalBaseTimeInMinutes will reset via its useEffect
    setCurrentProjectId(null);
    setCurrentProjectName(null);
    localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
    
    // Clear individual workspace items from localStorage
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
      handleNewProject(); // If current project deleted, start a new one
    }
  }, [savedProjects, currentProjectId, toast, handleNewProject]);
  
  const getCurrentProjectDataForDialog = (): ProjectData | null => {
    if (!currentProjectId && !requirementsDocument && modules.length === 0 && risks.length === 0) {
        // Truly new/empty project
        return null;
    }
    const totalAdjustedTime = totalBaseTimeInMinutes.times(new Decimal(effortMultiplier));
    const cost = hourlyRate > 0 ? totalAdjustedTime.dividedBy(60).times(new Decimal(hourlyRate)) : new Decimal(0);

    return {
        requirementsDocument,
        modules,
        risks,
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
          <TabsList className="grid w-full h-auto grid-cols-1 sm:grid-cols-3 mb-6 bg-card shadow-sm">
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
              projectData={getCurrentProjectDataForDialog()} // Pass all current data for export
              modules={modules} // Keep for consistency if PS uses it directly
              risks={risks} // Keep for consistency
              setRisks={setRisks} // Keep for consistency
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
      />
    </div>
  );
}
