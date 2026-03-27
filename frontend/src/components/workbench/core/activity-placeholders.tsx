export function PlaceholderPrimarySidebar({
  heading,
  title,
  description,
}: {
  heading: string;
  title: string;
  description: string;
}) {

  return (
    <aside className="flex h-full flex-col bg-[#252526]">
      <div className="flex h-9 items-center justify-between px-4 text-xs font-semibold tracking-wide text-[#bbbbbb]">
        <span>{heading}</span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 px-4 text-sm text-[#9d9d9d]">
        <p className="font-medium text-[#cccccc]">{title}</p>
        <p>{description}</p>
      </div>
    </aside>
  );
}

export function PlaceholderMainArea({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-[#1e1e1e] p-8 text-sm text-[#8c8c8c]">
      <div className="max-w-md space-y-2 text-center">
        <div className="text-base font-medium text-[#cccccc]">{title}</div>
        <p>{description}</p>
      </div>
    </div>
  );
}

