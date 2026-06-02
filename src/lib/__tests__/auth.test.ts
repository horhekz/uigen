import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));
vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";
import { NextRequest } from "next/server";

const mockSign = vi.fn().mockResolvedValue("mock-token");
const mockSetExpirationTime = vi.fn().mockReturnThis();
const mockSetIssuedAt = vi.fn().mockReturnThis();
const mockSetProtectedHeader = vi.fn().mockReturnThis();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(SignJWT).mockImplementation(() => ({
    setProtectedHeader: mockSetProtectedHeader,
    setExpirationTime: mockSetExpirationTime,
    setIssuedAt: mockSetIssuedAt,
    sign: mockSign,
  }) as any);
});

describe("createSession", () => {
  it("signs a JWT and sets an httpOnly cookie", async () => {
    await createSession("user-1", "test@example.com");

    expect(mockSign).toHaveBeenCalled();
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "auth-token",
      "mock-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      })
    );
  });

  it("sets secure flag in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });

    await createSession("user-1", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "auth-token",
      "mock-token",
      expect.objectContaining({ secure: true })
    );

    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, configurable: true });
  });

  it("sets expiry ~7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const { expires } = mockCookieStore.set.mock.calls[0][2];
    const expiresMs = expires instanceof Date ? expires.getTime() : 0;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDays + 1000);
  });
});

describe("getSession", () => {
  it("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getSession();

    expect(result).toBeNull();
  });

  it("returns the session payload for a valid token", async () => {
    const payload: SessionPayload = {
      userId: "user-1",
      email: "test@example.com",
      expiresAt: new Date(),
    };
    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    vi.mocked(jwtVerify).mockResolvedValue({ payload } as any);

    const result = await getSession();

    expect(result).toEqual(payload);
  });

  it("returns null when jwtVerify throws (expired or tampered token)", async () => {
    mockCookieStore.get.mockReturnValue({ value: "bad-token" });
    vi.mocked(jwtVerify).mockRejectedValue(new Error("JWTExpired"));

    const result = await getSession();

    expect(result).toBeNull();
  });
});

describe("deleteSession", () => {
  it("deletes the auth-token cookie", async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  const makeRequest = (token?: string) => {
    const req = new NextRequest("http://localhost/");
    if (token) {
      Object.defineProperty(req, "cookies", {
        value: { get: vi.fn().mockReturnValue({ value: token }) },
      });
    } else {
      Object.defineProperty(req, "cookies", {
        value: { get: vi.fn().mockReturnValue(undefined) },
      });
    }
    return req;
  };

  it("returns null when no cookie is present in the request", async () => {
    const result = await verifySession(makeRequest());
    expect(result).toBeNull();
  });

  it("returns session payload for a valid request token", async () => {
    const payload: SessionPayload = {
      userId: "user-2",
      email: "other@example.com",
      expiresAt: new Date(),
    };
    vi.mocked(jwtVerify).mockResolvedValue({ payload } as any);

    const result = await verifySession(makeRequest("valid-token"));

    expect(result).toEqual(payload);
  });

  it("returns null when token verification fails", async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error("JWTInvalid"));

    const result = await verifySession(makeRequest("invalid-token"));

    expect(result).toBeNull();
  });
});
