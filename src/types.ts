export type WorkerResponse<T = unknown> = {
  id: string;
  value: T;
};

export type Context = {
  [key: string]: unknown;
  id: string;
};
