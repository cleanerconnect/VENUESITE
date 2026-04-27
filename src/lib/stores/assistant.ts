import { create } from "zustand";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** While streaming, the message is being typed in token by token. */
  streaming?: boolean;
}

interface AssistantState {
  open: boolean;
  messages: AssistantMessage[];
  setOpen: (open: boolean) => void;
  toggle: () => void;
  pushUser: (text: string) => string; // returns user message id
  pushAssistant: () => string; // creates an empty streaming assistant msg
  appendToAssistant: (id: string, chunk: string) => void;
  finishAssistant: (id: string) => void;
  reset: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  open: false,
  messages: [],
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  pushUser: (text) => {
    const id = `m_${Date.now()}_u`;
    set((s) => ({
      messages: [...s.messages, { id, role: "user", content: text }],
    }));
    return id;
  },
  pushAssistant: () => {
    const id = `m_${Date.now()}_a`;
    set((s) => ({
      messages: [
        ...s.messages,
        { id, role: "assistant", content: "", streaming: true },
      ],
    }));
    return id;
  },
  appendToAssistant: (id, chunk) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m,
      ),
    })),
  finishAssistant: (id) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, streaming: false } : m,
      ),
    })),
  reset: () => set({ messages: [] }),
}));
