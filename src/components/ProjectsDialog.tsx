
"use client";

import type * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { Project, ProjectData } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilePlus2, Trash2, FolderOpen, Save, FileUp, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ProjectsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projects: Project[];
  currentProjectId: string | null;
  currentProjectName: string | null;
  currentProjectData: ProjectData | null;
  onLoadProject: (projectId: string) => void;
  onSaveProject: (name: string, projectData: ProjectData) => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onImportProject: (fileContent: string) => void;
}

const ITEMS_PER_PAGE = 10;

export default function ProjectsDialog({
  isOpen,
  onOpenChange,
  projects,
  currentProjectId,
  currentProjectName,
  currentProjectData,
  onLoadProject,
  onSaveProject,
  onNewProject,
  onDeleteProject,
  onImportProject,
}: ProjectsDialogProps) {
  const [projectNameInput, setProjectNameInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProjectNameInput(currentProjectName || '');
      setCurrentPage(1); // Reset to first page when dialog opens
    }
  }, [isOpen, currentProjectName]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [projects]);

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedProjects.slice(startIndex, endIndex);
  }, [sortedProjects, currentPage]);

  const totalPages = Math.ceil(sortedProjects.length / ITEMS_PER_PAGE);

  const handleSave = () => {
    if (!projectNameInput.trim()) {
      toast({ title: "Project Name Required", description: "Please enter a name for the project.", variant: "destructive" });
      return;
    }
    if (!currentProjectData) {
        toast({ title: "No Data to Save", description: "There is no current project data to save. Try making some changes first.", variant: "destructive" });
        return;
    }
    onSaveProject(projectNameInput.trim(), currentProjectData);
  };

  const handleConfirmDelete = (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      onDeleteProject(projectId);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json') {
        toast({ title: "Invalid File Type", description: "Please select a JSON file (.json).", variant: "destructive" });
        if (event.target) event.target.value = ""; // Reset file input
        return;
      }
      try {
        const fileContent = await file.text();
        onImportProject(fileContent);
        // onOpenChange(true); // Ensure dialog stays open or re-opens
      } catch (readError) {
        console.error("Error reading file:", readError);
        toast({ title: "File Read Error", description: "Could not read the selected file.", variant: "destructive" });
      }
      if (event.target) {
        event.target.value = ""; // Reset file input to allow re-selection of the same file
      }
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-full">
        <DialogHeader className="h-auto">
          <DialogTitle className="text-2xl font-headline">Manage Projects</DialogTitle>
          <DialogDescription>
            Load, save, import, or delete your projects. You can also start a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 max-h-[75vh] overflow-y-auto">
          {/* Left Column: Project List */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold font-headline">Saved Projects</h3>
            {projects.length === 0 ? (
              <p className="text-muted-foreground">No projects saved yet.</p>
            ) : (
              <>
                <ScrollArea className="h-[350px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProjects.map((project) => (
                        <TableRow key={project.id} className={project.id === currentProjectId ? 'bg-muted' : ''}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>{format(new Date(project.updatedAt), "PPpp")}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => onLoadProject(project.id)} className="mr-2">
                              <FolderOpen className="h-4 w-4 mr-1" /> Load
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleConfirmDelete(project.id, project.name)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-6 border-l md:pl-6 flex flex-col">
             <div className="flex flex-col">
              <h3 className="text-lg font-semibold font-headline mb-4">Current Project</h3>
              <Label htmlFor="project-name-input" className="mb-2">Project Name</Label>
              <Input
                id="project-name-input"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                placeholder="Enter project name"
                className="mb-3"
              />
              <Button onClick={handleSave} className="w-full h-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <Save className="h-4 w-4 mr-2" /> {currentProjectId ? 'Save Current Project' : 'Save as New Project'}
              </Button>
               {currentProjectId && (
                 <Button onClick={() => { setCurrentPage(1); setProjectNameInput(''); onOpenChange(false); onNewProject(); onOpenChange(true);}} className="w-full mt-2" variant="outline">
                    <FileUp className="h-4 w-4 mr-2" /> Save as New Copy...
                 </Button>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {currentProjectId ? `Currently editing: "${currentProjectName}". Saving will update this project.` : "Saving will create a new project."}
                </p>
            </div>
            
            <div className="border-t pt-4 mt-auto">
              <h3 className="text-lg font-semibold font-headline mb-2">Other Actions</h3>
              <Button onClick={onNewProject} variant="outline" className="w-full mb-2">
                <FilePlus2 className="h-4 w-4 mr-2" /> Start New Blank Project
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept=".json"
                className="hidden"
                title="Upload file"
              />
              <Button onClick={handleImportClick} variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" /> Import Project (JSON)
              </Button>
              <p className="text-xs text-muted-foreground mt-1">Import clears current workspace if successful and adds to saved projects.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
