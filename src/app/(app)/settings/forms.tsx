"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/form-message";
import type { AppSettings } from "@/lib/settings";
import { addTeamMember, saveDefaults, type SettingsState } from "./actions";

const selectClass = "h-8 rounded-lg border border-input bg-background px-2.5 text-sm";

export function TeamForm() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(addTeamMember, {});
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input name="email" type="email" placeholder="email@unitedheritage.com" required className="min-w-[200px] flex-1" />
        <Input name="name" placeholder="Name (optional)" className="w-40" />
        <select name="role" defaultValue="designer" className={selectClass}>
          <option value="designer">Designer</option>
          <option value="owner">Owner</option>
        </select>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      <FormMessage message={state.error} />
      <FormMessage message={state.success} tone="success" />
    </form>
  );
}

export function DefaultsForm({ settings }: { settings: AppSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveDefaults, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="reviewWindowDays">Review window (days)</Label>
          <Input id="reviewWindowDays" name="reviewWindowDays" type="number" min={1} max={60} defaultValue={settings.defaults.reviewWindowDays} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plannedRounds">Planned rounds</Label>
          <Input id="plannedRounds" name="plannedRounds" type="number" min={1} max={20} defaultValue={settings.defaults.plannedRounds} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="revisionDays">Revision time (days)</Label>
          <Input id="revisionDays" name="revisionDays" type="number" min={0} max={60} defaultValue={settings.defaults.revisionDays} />
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="halfwayEnabled" defaultChecked={settings.reminders.halfwayEnabled} className="size-4 accent-[var(--uh-navy)]" />
          Remind approvers halfway through the review window
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="dueDateEnabled" defaultChecked={settings.reminders.dueDateEnabled} className="size-4 accent-[var(--uh-navy)]" />
          Remind approvers on the due date
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="autoCompleteOnApproval" defaultChecked={settings.autoCompleteOnApproval} className="size-4 accent-[var(--uh-navy)]" />
          Mark projects done automatically when every item is approved
        </label>
      </div>
      <div className="space-y-2 rounded-lg bg-canvas/60 p-3">
        <p className="text-sm font-medium text-ink">Letter page</p>
        <p className="text-xs text-slate">Printed on the on-screen letterhead when copy is written as a letter. The Word download uses the real letterhead file below.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input name="letterCompanyName" defaultValue={settings.letter.companyName} placeholder="Company name" />
          <Input name="letterAddressLine" defaultValue={settings.letter.addressLine} placeholder="Street, City, State ZIP" />
          <Input name="letterContactLine" defaultValue={settings.letter.contactLine} placeholder="Phone · website" />
        </div>
      </div>
      <FormMessage message={state.error} />
      <FormMessage message={state.success} tone="success" />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
