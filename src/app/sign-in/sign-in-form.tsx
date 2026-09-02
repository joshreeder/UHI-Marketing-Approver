"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/form-message";
import { requestSignInLink, type SignInState } from "./actions";

export function SignInForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(requestSignInLink, { ok: false });

  if (state.ok) {
    return (
      <div className="space-y-3 text-center">
        <FormMessage tone="success" message={`Check your email. If ${state.email} is on the team, a sign-in link is on its way.`} />
        <p className="text-xs text-slate">The link works once and expires in 15 minutes.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus placeholder="you@unitedheritage.com" />
      </div>
      <FormMessage message={state.message ?? initialError} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
