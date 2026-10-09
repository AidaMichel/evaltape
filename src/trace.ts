export type TraceEvent = {
  sequence: number;
  type:
    | "task_start"
    | "state_before"
    | "action"
    | "state_after"
    | "eval_result";

  timestamp: number;

  message?: string;
  name?: string;
  data?: unknown;
  state?: unknown;
  result?: unknown;
};

export class TraceRecorder {
  private events: TraceEvent[] = [];
  private sequence = 0;

  record(
    event: Omit<TraceEvent, "timestamp" | "sequence">
  ) {
    this.sequence += 1;

    this.events.push({
      ...event,
      sequence: this.sequence,
      timestamp: Date.now()
    });
  }

  getEvents() {
    return this.events;
  }
}
