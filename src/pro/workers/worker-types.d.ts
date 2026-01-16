// Web Worker type definitions
declare const self: DedicatedWorkerGlobalScope;
declare function postMessage(message: any, transfer?: Transferable[]): void;

// Extend MessageEvent to be generic
interface MessageEvent<T = any> {
  data: T;
  origin: string;
  lastEventId: string;
  source: MessageEventSource | null;
  ports: ReadonlyArray<MessagePort>;
}

