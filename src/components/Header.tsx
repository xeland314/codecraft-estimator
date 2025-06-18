import { Briefcase } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <Briefcase className="h-8 w-8 text-primary mr-3" />
        <h1 className="font-headline text-3xl font-semibold text-primary">
          CodeCraft Estimator
        </h1>
      </div>
    </header>
  );
}
