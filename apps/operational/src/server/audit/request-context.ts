import { randomUUID } from "node:crypto";

export type AuditRequestContext = {
  requestId: string;
  correlationId: string;
  transactionId: string;
};

export function createAuditRequestContext(): AuditRequestContext {
  return {
    requestId: randomUUID(),
    correlationId: randomUUID(),
    transactionId: randomUUID(),
  };
}
