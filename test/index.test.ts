import { WorkerThreadRpc } from "../src";

type RpcMap = {
  test: {
    params: { test: true };
    context: {};
    response: 1;
  };
};

describe("Worker thread RPC", () => {
  it("Simple call", async () => {
    const wtr = new WorkerThreadRpc<RpcMap>();
    wtr.registerRpc("test", async (params, context) => {
      expect(params).toEqual({ test: true });
      expect(typeof context.id).toEqual("string");
      return 1;
    });
    const resp = await wtr.callRpc("test");
    expect(resp).toEqual(1);
  });
});
