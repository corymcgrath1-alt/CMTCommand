import { describe, expect, it } from "vitest";
import { checkDatabaseConnectivity } from "../../src/server/db/check";

describe("checkDatabaseConnectivity", () => {
  it("returns database_not_configured without a database URL", async () => {
    await expect(checkDatabaseConnectivity({ databaseUrl: "" })).resolves.toEqual({
      status: "unavailable",
      reason: "database_not_configured",
    });
  });

  it("runs the injected probe and maps success", async () => {
    const seenUrls: string[] = [];

    await expect(
      checkDatabaseConnectivity({
        databaseUrl: "postgresql://db.example.test/cmtcommand",
        probe: async (databaseUrl) => {
          seenUrls.push(databaseUrl);
        },
      }),
    ).resolves.toEqual({ status: "ok" });

    expect(seenUrls).toEqual(["postgresql://db.example.test/cmtcommand"]);
  });

  it("maps probe failures without exposing raw driver details", async () => {
    const result = await checkDatabaseConnectivity({
      databaseUrl: "postgresql://db.example.test/cmtcommand",
      probe: async () => {
        throw new Error("raw-sensitive-value host=private.internal");
      },
    });

    expect(result).toEqual({
      status: "unavailable",
      reason: "database_unavailable",
    });
    expect(JSON.stringify(result)).not.toContain("raw-sensitive-value");
    expect(JSON.stringify(result)).not.toContain("private.internal");
  });
});
