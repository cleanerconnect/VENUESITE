"use client";

// The read hook.
//
// Every event-workspace screen gets its data through this, so all of
// them handle the same four outcomes in the same shape. Before it, each
// screen imported the dataset directly and rendered as if data were
// always present — which is why none of them had a loading, empty or
// error state to speak of.
//
// Deliberately ~80 lines rather than a query library: the portal has one
// data source, no cache invalidation story and no mutations flowing
// through here. A dependency would be more surface for the external team
// to learn than the thing it replaces.

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { EventRepository } from "./event-repository";
import {
  EmptyEventRepository,
  FailingEventRepository,
  StaticEventRepository,
} from "./static-event-repository";
import { DEMO_STATE_PARAM, parseDemoState } from "./demo-state";

export type QueryStatus = "loading" | "ready" | "error";

export interface Query<T> {
  status: QueryStatus;
  data: T | null;
  error: Error | null;
  /** True when the query succeeded and returned nothing worth showing. */
  isEmpty: boolean;
  /** Re-runs the read. Wired to the retry button on the error state. */
  retry: () => void;
}

const staticRepo = new StaticEventRepository();
const emptyRepo = new EmptyEventRepository();
const failingRepo = new FailingEventRepository();

/**
 * The repository the current render should read from.
 *
 * A real backend replaces `staticRepo` here and nothing else in the app
 * moves — the demo drivers stay reachable only through `?etat=`, which a
 * production build can strip by ignoring the param.
 */
export function useEventRepository(): EventRepository {
  const params = useSearchParams();
  const forced = parseDemoState(params.get(DEMO_STATE_PARAM));
  if (forced === "vide") return emptyRepo;
  if (forced === "erreur") return failingRepo;
  return staticRepo;
}

/** True when the page is pinned to the loading state for demonstration. */
export function useForcedLoading(): boolean {
  const params = useSearchParams();
  return parseDemoState(params.get(DEMO_STATE_PARAM)) === "chargement";
}

/**
 * Runs `read` against the current repository.
 *
 * `deps` is the dependency list, exactly like `useEffect` — the read
 * re-runs when it changes. Pass `[]` for a query with no inputs.
 *
 * `isEmpty` treats an empty array and a null result as empty, so a
 * caller writes one branch instead of two.
 */
export function useEventQuery<T>(
  read: (repo: EventRepository) => Promise<T>,
  deps: unknown[],
): Query<T> {
  const repo = useEventRepository();
  const forcedLoading = useForcedLoading();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{
    status: QueryStatus;
    data: T | null;
    error: Error | null;
  }>({ status: "loading", data: null, error: null });

  // Held in a ref so changing the callback identity between renders — it
  // is an inline arrow at almost every call site — does not re-fire the
  // read on its own.
  const readRef = useRef(read);
  readRef.current = read;

  useEffect(() => {
    if (forcedLoading) {
      setState({ status: "loading", data: null, error: null });
      return;
    }

    let live = true;
    setState((prev) => ({ ...prev, status: "loading" }));

    Promise.resolve()
      .then(() => readRef.current(repo))
      .then((data) => {
        if (live) setState({ status: "ready", data, error: null });
      })
      .catch((error: unknown) => {
        if (!live) return;
        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, forcedLoading, nonce, ...deps]);

  return useMemo(
    () => ({
      status: state.status,
      data: state.data,
      error: state.error,
      isEmpty:
        state.status === "ready" &&
        (state.data === null ||
          (Array.isArray(state.data) && state.data.length === 0)),
      retry: () => setNonce((n) => n + 1),
    }),
    [state],
  );
}
