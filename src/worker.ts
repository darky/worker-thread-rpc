import { parentPort, MessagePort } from "worker_threads";

import { roundrobin } from "./utils";
import { WorkerResponse, Context } from "./types";

let rpcMap = new Map<string, Function>();
let siblingsForCall = new Map<number, MessagePort>();
let siblingsForReceive = new Map<number, MessagePort>();
let nextWorkerId: () => number;

const call = (name: string, params: unknown, context: Context) => {
  return new Promise(resolve => {
    const workerId = nextWorkerId();
    const port = siblingsForCall.get(workerId)!;
    const cb = (msg: WorkerResponse) => {
      if (msg.id === context.id) {
        port.removeListener("message", cb);
        resolve(msg.value);
      }
    };
    port.on("message", cb);
    port.postMessage({ name, params, context });
  });
};

function main() {
  if (!parentPort) {
    return process.exit(-1);
  }

  return parentPort.on("message", async msg => {
    switch (msg.type) {
      case "registerRpc": {
        rpcMap.set(msg.name, eval(msg.fn)());
        break;
      }
      case "callRpc": {
        const fn = rpcMap.get(msg.name)!;
        const value = await fn(msg.params, msg.context, call);
        parentPort!.postMessage({ id: msg.context.id, value });
        break;
      }
      case "initCommunicationForCall": {
        siblingsForCall.set(msg.workerId, msg.port);
        break;
      }
      case "initCommunicationForReceive": {
        siblingsForReceive.set(msg.workerId, msg.port);
        break;
      }
      case "siblingsReady": {
        const workerIds = Array.from(
          new Set(Array.from(siblingsForCall.keys()))
        );
        nextWorkerId = roundrobin(workerIds);
        for (const port of siblingsForReceive.values()) {
          port.on("message", async msg => {
            const fn = rpcMap.get(msg.name)!;
            const value = await fn(msg.params, msg.context, call);
            port.postMessage({ id: msg.context.id, value });
          });
        }
        break;
      }
    }
  });
}

main();
