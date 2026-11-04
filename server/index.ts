import express from "express";
import { createServer } from "node:http";
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { eq } from "drizzle-orm";
import { createServer as createViteServer } from "vite";
import { db } from "./db";
import { users } from "../shared/schema";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";

const app = express();
const httpServer = createServer(app);

// The proxy must precede body parsing so Clerk requests retain their raw body.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/sync", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }

  try {
    // Resolve the email from Clerk on the server rather than trusting client input.
    const clerkUser = await clerkClient.users.getUser(userId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId,
    );

    if (!primaryEmail) {
      res.status(400).json({ error: "Your account needs a primary email address." });
      return;
    }

    const existingEmailOwner = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, primaryEmail.emailAddress))
      .limit(1);

    if (existingEmailOwner[0] && existingEmailOwner[0].id !== userId) {
      res.status(409).json({ error: "That email is already linked to another account." });
      return;
    }

    await db
      .insert(users)
      .values({ id: userId, email: primaryEmail.emailAddress })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: primaryEmail.emailAddress },
      });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Account sync failed:", error);
    res.status(500).json({ error: "We couldn't finish setting up your account. Please try again." });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist/client"));
  app.get("*", (_req, res) => res.sendFile("index.html", { root: "dist/client" }));
} else {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server: httpServer },
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

const port = Number(process.env.PORT || 5000);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`The Crochet Edit is listening on port ${port}`);
});
