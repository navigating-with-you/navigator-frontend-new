import type { JSX } from "react";

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-3 sm:p-6 md:p-8 text-center bg-transparent dark:bg-zinc-950/20 shrink-0">
      <div className="w-16 h-16 mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
        <span className="text-2xl font-semibold">{title.charAt(0)}</span>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{title}</h1>
      <p className="text-zinc-500 dark:text-zinc-450 max-w-md text-sm leading-relaxed">
        This is a placeholder for the {title} page. This section of the application is currently under development.
      </p>
    </div>
  );
}
