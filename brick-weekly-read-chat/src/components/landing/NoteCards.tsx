import { FileStructureCard } from './FileStructureCard';
import { TechStackCard } from './TechStackCard';

export function NoteCards() {
  return (
    <section className="border-b border-neutral-200 bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Note cards</h2>
        <p className="mt-1 text-sm text-neutral-500">Helpful reminders of what does what.</p>
        <div className="mt-6 space-y-4">
          <FileStructureCard />
          <TechStackCard />
        </div>
      </div>
    </section>
  );
}
