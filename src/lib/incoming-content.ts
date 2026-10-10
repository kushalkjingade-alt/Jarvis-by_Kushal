export type IncomingContent = {
  title: string;
  body: string;
};

let pendingContent: IncomingContent | null = null;

const INCOMING_EVENT = "jarvis:incoming-content";

export function setIncomingContent(content: IncomingContent) {
  pendingContent = content;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INCOMING_EVENT));
  }
}

export function consumeIncomingContent(): IncomingContent | null {
  const content = pendingContent;
  pendingContent = null;
  return content;
}

export function subscribeIncomingContent(callback: (content: IncomingContent) => void) {
  if (typeof window === "undefined") return () => {};

  const handleIncoming = () => {
    const content = consumeIncomingContent();
    if (content) callback(content);
  };

  window.addEventListener(INCOMING_EVENT, handleIncoming);

  // Also consume content that arrived before the Notes screen subscribed.
  handleIncoming();

  return () => {
    window.removeEventListener(INCOMING_EVENT, handleIncoming);
  };
}
