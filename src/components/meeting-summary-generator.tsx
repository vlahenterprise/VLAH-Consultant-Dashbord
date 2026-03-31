"use client";

import { useState } from "react";
import { StatusChip } from "@/components/status-chip";
import { SummaryResult } from "@/lib/types";

type MeetingSummaryGeneratorProps = {
  clientName: string;
  meetingTitle: string;
  defaultTranscript: string;
};

export function MeetingSummaryGenerator({
  clientName,
  meetingTitle,
  defaultTranscript,
}: MeetingSummaryGeneratorProps) {
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/meeting-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName,
          meetingTitle,
          transcript,
        }),
      });

      if (!response.ok) {
        throw new Error("Nije uspelo generisanje summary-ja.");
      }

      const payload = (await response.json()) as SummaryResult;
      setResult(payload);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Doslo je do neocekivane greske.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="brand-item p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Demo input za AI summary
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Za sada simuliramo transcript. Sledeci korak je upload audio fajla
              i pravi OpenAI pipeline nad sastankom.
            </p>
          </div>
          <StatusChip label="Demo flow" tone="accent" />
        </div>

        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={10}
          className="brand-input mt-4 min-h-[240px] resize-y"
          placeholder="Unesi transcript sa sastanka..."
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !transcript.trim()}
            className="brand-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generisem summary..." : "Generisi AI summary"}
          </button>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
      </div>

      <div className="brand-item p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Rezultat</h3>
            <p className="mt-1 text-sm text-muted">
              {clientName} · {meetingTitle}
            </p>
          </div>
          <StatusChip
            label={result ? "Spremno" : "Ceka input"}
            tone={result ? "success" : "neutral"}
          />
        </div>

        {result ? (
          <div className="mt-4 space-y-4 text-sm leading-6">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ff946d]">
                Kratak overview
              </p>
              <p className="mt-2 text-foreground">{result.overview}</p>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ff946d]">
                Kljucne tacke
              </p>
              <ul className="mt-2 space-y-2 text-muted">
                {result.keyPoints.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ff946d]">
                Action items
              </p>
              <ul className="mt-2 space-y-2 text-muted">
                {result.actionItems.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ff946d]">
                Rizici
              </p>
              <ul className="mt-2 space-y-2 text-muted">
                {result.riskFlags.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ff946d]">
                Predlog follow-up-a
              </p>
              <p className="mt-2 text-foreground">{result.suggestedFollowUp}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[20px] border border-white/8 bg-white/4 p-4 text-sm text-muted">
            Kada kliknes na dugme levo, dobijas strukturirani summary spreman za
            meeting notes i CRM bazu.
          </div>
        )}
      </div>
    </div>
  );
}
