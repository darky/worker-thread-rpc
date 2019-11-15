import crypto from "crypto";

export function roundrobin(array = [], index = 0) {
  return function() {
    if (index >= array.length) index = 0;
    return array[index++];
  };
}

export function genUid() {
  return crypto.randomBytes(12).toString("hex");
}
