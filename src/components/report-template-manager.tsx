"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/status-chip";
import { ReportTemplate } from "@/lib/types";

type ReportTemplateManagerProps = {
  reportTemplates: ReportTemplate[];
};

export function ReportTemplateManager({
  reportTemplates,
}: ReportTemplateManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(reportTemplates[0]?.id ?? "");
  const selectedTemplate = useMemo(
    () => reportTemplates.find((template) => template.id === selectedId) ?? reportTemplates[0],
    [reportTemplates, selectedId],
  );
  const [form, setForm] = useState(() => ({
    name: selectedTemplate?.name ?? "",
    reportType: selectedTemplate?.reportType ?? "",
    audience: selectedTemplate?.audience ?? "Interno",
    description: selectedTemplate?.description ?? "",
    prePrompt: selectedTemplate?.prePrompt ?? "",
    prompt: selectedTemplate?.prompt ?? "",
    outputSections: selectedTemplate?.outputSections.join(", ") ?? "",
  }));
  const [feedback, setFeedback] = useState("");

  function syncTemplate(templateId: string) {
    const template = reportTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setSelectedId(templateId);
    setForm({
      name: template.name,
      reportType: template.reportType,
      audience: template.audience,
      description: template.description,
      prePrompt: template.prePrompt,
      prompt: template.prompt,
      outputSections: template.outputSections.join(", "),
    });
    setFeedback("");
  }

  async function handleSave() {
    if (!selectedTemplate) {
      return;
    }

    setFeedback("");
    const response = await fetch("/api/admin/report-templates", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateId: selectedTemplate.id,
        name: form.name,
        reportType: form.reportType,
        audience: form.audience,
        description: form.description,
        prePrompt: form.prePrompt,
        prompt: form.prompt,
        outputSections: form.outputSections
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setFeedback(payload.error || "Nije uspelo cuvanje report templata.");
      return;
    }

    setFeedback("Report template je sacuvan.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="brand-item p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">AI prompt biblioteka</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Pred prompt i glavno uputstvo uredjuju se ovde, a svi templejti automatski izbacuju osetljive podatke iz AI konteksta.
            </p>
          </div>
          <StatusChip label={`${reportTemplates.length} templejta`} tone="accent" />
        </div>

        <div className="mt-4 grid gap-3">
          {reportTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => syncTemplate(template.id)}
              className={`rounded-[18px] border px-4 py-4 text-left transition ${
                template.id === selectedTemplate?.id
                  ? "border-accent/60 bg-accent/10"
                  : "border-white/8 bg-white/4"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{template.name}</p>
                  <p className="mt-1 text-sm text-muted">{template.description}</p>
                </div>
                <StatusChip label={template.reportType} tone="neutral" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {template.programIds.map((programId) => (
                  <span key={programId} className="brand-pill">
                    {programId}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="brand-item p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">Uredjivanje templata</p>
            <p className="mt-1 text-sm text-muted">
              Templejt odredjuje tip izvestaja, strukturu i ton koji AI treba da prati.
            </p>
          </div>
          {selectedTemplate ? (
            <StatusChip label={selectedTemplate.audience} tone="info" />
          ) : null}
        </div>

        {selectedTemplate ? (
          <div className="mt-4 grid gap-3">
            <input
              className="brand-input"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Naziv templata"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="brand-input"
                value={form.reportType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reportType: event.target.value }))
                }
                placeholder="Tip izvestaja"
              />
              <select
                className="brand-input"
                value={form.audience}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    audience: event.target.value as ReportTemplate["audience"],
                  }))
                }
              >
                <option value="Interno">Interno</option>
                <option value="Klijent">Klijent</option>
                <option value="Interno + klijent">Interno + klijent</option>
              </select>
            </div>
            <textarea
              className="brand-input min-h-[80px] resize-y"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Opis templata"
            />
            <textarea
              className="brand-input min-h-[140px] resize-y"
              value={form.prePrompt}
              onChange={(event) =>
                setForm((current) => ({ ...current, prePrompt: event.target.value }))
              }
              placeholder="Pred prompt"
            />
            <textarea
              className="brand-input min-h-[180px] resize-y"
              value={form.prompt}
              onChange={(event) =>
                setForm((current) => ({ ...current, prompt: event.target.value }))
              }
              placeholder="Glavno uputstvo"
            />
            <input
              className="brand-input"
              value={form.outputSections}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  outputSections: event.target.value,
                }))
              }
              placeholder="Sekcije, odvojene zarezom"
            />

            <div className="rounded-[18px] border border-white/8 bg-black/12 px-4 py-4 text-sm text-muted">
              <p className="font-semibold text-foreground">Automatski uklonjeno iz AI konteksta</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTemplate.excludedFields.map((item) => (
                  <span key={item} className="brand-pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isPending}
                onClick={handleSave}
              >
                Sacuvaj template
              </button>
              {feedback ? <p className="text-sm text-muted">{feedback}</p> : null}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Nema dostupnog templata za uredjivanje.
          </p>
        )}
      </div>
    </div>
  );
}
