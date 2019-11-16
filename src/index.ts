import os from "os";
import { Worker, MessageChannel } from "worker_threads";
import path from "path";
import EventEmitter from "events";

import { roundrobin, genUid } from "./utils";
import { WorkerResponse, Context } from "./types";

export type WorkerThreadRpcOptions = {
  workerCount?: number;
};

export class WorkerThreadRpc<
  RpcMap extends { [K: string]: { params: any; context: any; response: any } }
> {
  private workerCount!: number;
  private workers = new Map<number, Worker>();
  private nextWorkerId!: () => number;
  private events = new EventEmitter();

  constructor(private options: WorkerThreadRpcOptions = {}) {
    this.initWorkersCount();
    this.initWorkersMap();
    this.initWorkersMessageChannels();
    this.initWorkersSiblingsReady();
    this.initWorkerRoundRobin();
    this.initListenCallRpc();
  }

  registerRpc<K extends keyof RpcMap>(
    name: K,
    fn: (
      params: RpcMap[K]["params"],
      context: RpcMap[K]["context"] & Context,
      call: <K extends keyof RpcMap>(
        name: K,
        params: RpcMap[K]["params"],
        context: RpcMap[K]["context"]
      ) => Promise<RpcMap[K]["response"]>
    ) => Promise<RpcMap[K]["response"]>
  ) {
    const fnStr = `() => (${fn.toString()})`;
    for (const worker of this.workers.values()) {
      worker.postMessage({ type: "registerRpc", name, fn: fnStr });
    }
  }

  async callRpc<K extends keyof RpcMap>(
    name: K,
    params: RpcMap[K]["params"],
    context: RpcMap[K]["context"]
  ) {
    return new Promise<RpcMap[K]["response"]>(resolve => {
      const workerId = this.nextWorkerId();
      const worker = this.workers.get(workerId)!;
      const id = genUid();
      Object.assign(context, { id });
      this.events.once(id, (msg: RpcMap[K]["response"]) => {
        resolve(msg);
      });
      worker.postMessage({ type: "callRpc", name, params, context });
    });
  }

  private initWorkersCount() {
    this.workerCount = this.options.workerCount || os.cpus().length;
  }

  private initWorkersMap() {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(path.resolve(__dirname, "./worker.js"));
      this.workers.set(worker.threadId, worker);
    }
  }

  private initWorkersMessageChannels() {
    for (const [w1Id, w1] of this.workers) {
      for (const [w2Id, w2] of this.workers) {
        if (w1Id === w2Id) {
          continue;
        }
        const { port1, port2 } = new MessageChannel();
        w1.postMessage(
          {
            type: "initCommunicationForCall",
            port: port1,
            workerId: w2Id
          },
          [port1]
        );
        w2.postMessage(
          { type: "initCommunicationForReceive", port: port2, workerId: w1Id },
          [port2]
        );
      }
    }
  }

  private initWorkersSiblingsReady() {
    for (const worker of this.workers.values()) {
      worker.postMessage({ type: "siblingsReady" });
    }
  }

  private initWorkerRoundRobin() {
    const workerIds = Array.from(this.workers.keys());
    this.nextWorkerId = roundrobin(workerIds);
  }

  private initListenCallRpc() {
    for (const worker of this.workers.values()) {
      worker.on("message", (msg: WorkerResponse) => {
        this.events.emit(msg.id, msg.value);
      });
    }
  }
}
