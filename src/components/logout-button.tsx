"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type LogoutButtonProps = {
  className?: string;
  label?: string;
};

export function LogoutButton({
  className = "brand-button-secondary",
  label = "Odjava",
}: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  async function handleLogout() {
    setFeedback("");

    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!response.ok) {
      setFeedback("Odjava nije uspela. Probaj ponovo.");
      return;
    }

    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        className={className}
        disabled={isPending}
        onClick={handleLogout}
      >
        {label}
      </button>
      {feedback ? <p className="text-xs text-muted">{feedback}</p> : null}
    </div>
  );
}
