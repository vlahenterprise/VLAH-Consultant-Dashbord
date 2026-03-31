import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  className?: string;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  eyebrow,
  className = "",
  children,
}: SectionCardProps) {
  return (
    <section className={`brand-panel px-5 py-5 md:px-6 md:py-6 ${className}`}>
      <div className="mb-5 flex flex-col gap-2">
        {eyebrow ? (
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#ff946d]">
            {eyebrow}
          </p>
        ) : null}
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}
