"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard } from "@/components/section-card";
import { StatusChip } from "@/components/status-chip";
import { ChipTone } from "@/lib/types";

type LoginMode = "staff" | "client";

type QuickAccessAccount = {
  id: string;
  name: string;
  email: string;
  secondary: string;
  tertiary?: string;
  badges: {
    label: string;
    tone: ChipTone;
  }[];
};

type LoginPanelProps = {
  mode: LoginMode;
  introEyebrow: string;
  introTitle: string;
  introDescription: string;
  listEyebrow: string;
  listTitle: string;
  listDescription: string;
  defaultPassword: string;
  accounts: QuickAccessAccount[];
};

export function LoginPanel({
  mode,
  introEyebrow,
  introTitle,
  introDescription,
  listEyebrow,
  listTitle,
  listDescription,
  defaultPassword,
  accounts,
}: LoginPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState(accounts[0]?.email ?? "");
  const [password, setPassword] = useState(defaultPassword);
  const [feedback, setFeedback] = useState("");

  async function submitLogin(nextEmail: string, nextPassword: string) {
    setFeedback("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        email: nextEmail,
        password: nextPassword,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      redirectTo?: string;
    };

    if (!response.ok || !payload.redirectTo) {
      setFeedback(
        payload.error || "Prijava nije uspela. Proveri email i lozinku.",
      );
      return;
    }

    const redirectTo = payload.redirectTo;
    startTransition(() => {
      router.push(redirectTo);
      router.refresh();
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitLogin(email, password);
  }

  function handleQuickLogin(nextEmail: string) {
    void submitLogin(nextEmail, defaultPassword);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <SectionCard
        eyebrow={introEyebrow}
        title={introTitle}
        description={introDescription}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm text-muted">
            <span>Email</span>
            <input
              className="brand-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={mode === "staff" ? "ime@vlah.rs" : "klijent@firma.rs"}
              autoComplete="email"
            />
          </label>

          <label className="grid gap-2 text-sm text-muted">
            <span>Lozinka</span>
            <input
              className="brand-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Lozinka"
              type="password"
              autoComplete="current-password"
            />
          </label>

          <div className="rounded-[20px] border border-white/8 bg-white/4 px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Prototip login</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Za sada koristimo jedan kontrolisani pristup po tipu korisnika da
              bismo zatvorili session i prava pristupa bez cekanja punog auth
              sistema.
            </p>
            <p className="mt-3 text-sm text-foreground">
              Lozinka za ovaj ekran: <span className="font-semibold">{defaultPassword}</span>
            </p>
          </div>

          <button
            type="submit"
            className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
          >
            Uloguj se
          </button>

          {feedback ? <p className="text-sm text-muted">{feedback}</p> : null}
        </form>
      </SectionCard>

      <SectionCard
        eyebrow={listEyebrow}
        title={listTitle}
        description={listDescription}
      >
        <div className="grid gap-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="brand-item flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {account.name}
                </p>
                <p className="text-sm text-muted">{account.secondary}</p>
                <p className="mt-1 text-sm text-muted">{account.email}</p>
                {account.tertiary ? (
                  <p className="mt-2 text-sm text-muted">{account.tertiary}</p>
                ) : null}
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <div className="flex flex-wrap gap-2">
                  {account.badges.map((badge) => (
                    <StatusChip
                      key={`${account.id}-${badge.label}`}
                      label={badge.label}
                      tone={badge.tone}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="brand-button-secondary"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(defaultPassword);
                    }}
                  >
                    Popuni
                  </button>
                  <button
                    type="button"
                    className="brand-button"
                    disabled={isPending}
                    onClick={() => handleQuickLogin(account.email)}
                  >
                    Udji odmah
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
