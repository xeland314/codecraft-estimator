import { Briefcase, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  currentProjectName?: string | null;
  onOpenProjectsDialog: () => void;
}

export default function Header({ currentProjectName, onOpenProjectsDialog }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Briefcase className="h-8 w-8 text-primary mr-3" />
          <div className="flex flex-col">
            <h1 className="font-headline text-2xl font-semibold text-primary">
              CodeCraft Estimator
            </h1>
            {currentProjectName && (
              <span className="text-xs text-muted-foreground -mt-1">
                Project: {currentProjectName}
              </span>
            )}
             {!currentProjectName && (
              <span className="text-xs text-muted-foreground -mt-1">
                Project: Untitled Project
              </span>
            )}
          </div>
        </div>
        <Button onClick={onOpenProjectsDialog} variant="outline" size="sm">
          <FolderKanban className="mr-2 h-4 w-4" />
          Manage Projects
        </Button>
      </div>
    </header>
  );
}
