import { WorkerThreadRpc } from "../src";

type RpcMap = {
  testResponse: {
    params: {};
    context: {};
    response: 1;
  };
  testParams: {
    params: { test: true };
    context: {};
    response: { test: true };
  };
  testContext: {
    params: {};
    context: { test: true };
    response: { test: true; id: string };
  };
};

describe("Worker thread RPC", () => {
  it("Simple check response", async () => {
    const wtr = new WorkerThreadRpc<RpcMap>();
    wtr.registerRpc("testResponse", async () => 1);
    const resp = await wtr.callRpc("testResponse", {}, {});
    expect(resp).toEqual(1);
  });

  it("Simple check params", async () => {
    const wtr = new WorkerThreadRpc<RpcMap>();
    wtr.registerRpc("testParams", async params => params);
    const resp = await wtr.callRpc("testParams", { test: true }, {});
    expect(resp).toEqual({ test: true });
  });

  it("Simple check context", async () => {
    const wtr = new WorkerThreadRpc<RpcMap>();
    wtr.registerRpc("testContext", async ({}, context) => context);
    const resp = await wtr.callRpc("testContext", {}, { test: true });
    expect(resp.test).toEqual(true);
    expect(typeof resp.id).toEqual("string");
  });
});
