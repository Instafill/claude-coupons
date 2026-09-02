import type { ActionState } from "@/app/founders/actions";

// The one line under every dashboard form: what happened, in the tone of the page.
export default function ActionMessage({ state }: { state: ActionState }) {
  if (state.error) return <p className="mt-2 text-sm text-bad">{state.error}</p>;
  if (state.success) return <p className="mt-2 text-sm font-semibold text-good">{state.success}</p>;
  return null;
}
