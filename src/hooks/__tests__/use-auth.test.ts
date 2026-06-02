import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { useRouter } from "next/navigation";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { useAuth } from "@/hooks/use-auth";

describe("useAuth", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "new-project-id" } as any);
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.signIn).toBeTypeOf("function");
    expect(result.current.signUp).toBeTypeOf("function");
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("calls signInAction with the provided credentials", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(signInAction).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("returns the result from signInAction", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getProjects).mockResolvedValue([{ id: "proj-1" } as any]);

      const { result } = renderHook(() => useAuth());
      let signInResult: any;

      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "password123");
      });

      expect(signInResult).toEqual({ success: true });
    });

    test("returns failure result when signInAction fails", async () => {
      const failureResult = { success: false, error: "Invalid credentials" };
      vi.mocked(signInAction).mockResolvedValue(failureResult);

      const { result } = renderHook(() => useAuth());
      let signInResult: any;

      await act(async () => {
        signInResult = await result.current.signIn("wrong@example.com", "wrongpass");
      });

      expect(signInResult).toEqual(failureResult);
    });

    test("does not navigate when signIn fails", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "badpass");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to true while signIn is in flight", async () => {
      let resolveSignIn!: (value: any) => void;
      vi.mocked(signInAction).mockImplementation(
        () => new Promise((resolve) => { resolveSignIn = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signInPromise!: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false });
        await signInPromise;
      });
    });

    test("resets isLoading to false after successful signIn", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getProjects).mockResolvedValue([{ id: "proj-1" } as any]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false after failed signIn", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when signInAction throws", async () => {
      vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with the provided credentials", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email taken" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(signUpAction).toHaveBeenCalledWith("new@example.com", "password123");
    });

    test("returns the result from signUpAction", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getProjects).mockResolvedValue([{ id: "proj-1" } as any]);

      const { result } = renderHook(() => useAuth());
      let signUpResult: any;

      await act(async () => {
        signUpResult = await result.current.signUp("new@example.com", "password123");
      });

      expect(signUpResult).toEqual({ success: true });
    });

    test("returns failure result when signUpAction fails", async () => {
      const failureResult = { success: false, error: "Email already registered" };
      vi.mocked(signUpAction).mockResolvedValue(failureResult);

      const { result } = renderHook(() => useAuth());
      let signUpResult: any;

      await act(async () => {
        signUpResult = await result.current.signUp("existing@example.com", "password123");
      });

      expect(signUpResult).toEqual(failureResult);
    });

    test("does not navigate when signUp fails", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@example.com", "password123");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to true while signUp is in flight", async () => {
      let resolveSignUp!: (value: any) => void;
      vi.mocked(signUpAction).mockImplementation(
        () => new Promise((resolve) => { resolveSignUp = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      let signUpPromise!: Promise<any>;
      act(() => {
        signUpPromise = result.current.signUp("new@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false });
        await signUpPromise;
      });
    });

    test("resets isLoading to false after signUp completes", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("test@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when signUpAction throws", async () => {
      vi.mocked(signUpAction).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("test@example.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("post-sign-in navigation", () => {
    describe("when anonymous work exists with messages", () => {
      const anonMessages = [{ id: "1", role: "user", content: "Design a button" }];
      const anonFileSystemData = { "/App.jsx": { type: "file", content: "..." } };

      beforeEach(() => {
        vi.mocked(getAnonWorkData).mockReturnValue({
          messages: anonMessages,
          fileSystemData: anonFileSystemData,
        });
        vi.mocked(createProject).mockResolvedValue({ id: "anon-project-id" } as any);
      });

      test("creates a project using the anon messages and filesystem data", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: anonMessages,
            data: anonFileSystemData,
          })
        );
      });

      test("project name contains 'Design from'", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({ name: expect.stringContaining("Design from") })
        );
      });

      test("clears anon work after project is created", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(clearAnonWork).toHaveBeenCalled();
      });

      test("navigates to the newly created project", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
      });

      test("skips fetching existing projects", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(getProjects).not.toHaveBeenCalled();
      });

      test("also works after successful signUp", async () => {
        vi.mocked(signUpAction).mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("new@example.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({ messages: anonMessages })
        );
        expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
      });
    });

    describe("when anonymous work has empty messages", () => {
      beforeEach(() => {
        vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
      });

      test("falls through to getProjects", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getProjects).mockResolvedValue([{ id: "proj-existing" } as any]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(getProjects).toHaveBeenCalled();
      });

      test("does not create a project from the empty anon work", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getProjects).mockResolvedValue([{ id: "proj-existing" } as any]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(createProject).not.toHaveBeenCalled();
        expect(clearAnonWork).not.toHaveBeenCalled();
      });

      test("navigates to the most recent existing project", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getProjects).mockResolvedValue([{ id: "proj-existing" } as any]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/proj-existing");
      });
    });

    describe("when no anonymous work exists", () => {
      beforeEach(() => {
        vi.mocked(getAnonWorkData).mockReturnValue(null);
      });

      test("navigates to the most recent project when projects exist", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getProjects).mockResolvedValue([
          { id: "proj-recent" } as any,
          { id: "proj-old" } as any,
        ]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/proj-recent");
      });

      test("does not navigate to a non-first project", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getProjects).mockResolvedValue([
          { id: "proj-recent" } as any,
          { id: "proj-old" } as any,
        ]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockPush).not.toHaveBeenCalledWith("/proj-old");
      });

      test("creates a new project when no existing projects found", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getProjects).mockResolvedValue([]);
        vi.mocked(createProject).mockResolvedValue({ id: "brand-new" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({ messages: [], data: {} })
        );
      });

      test("new project name matches 'New Design #<number>'", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getProjects).mockResolvedValue([]);
        vi.mocked(createProject).mockResolvedValue({ id: "brand-new" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({
            name: expect.stringMatching(/^New Design #\d+$/),
          })
        );
      });

      test("navigates to the newly created project", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getProjects).mockResolvedValue([]);
        vi.mocked(createProject).mockResolvedValue({ id: "brand-new" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/brand-new");
      });
    });
  });
});
