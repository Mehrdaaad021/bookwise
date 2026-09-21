// src/server/routers/_app.ts
import { router } from "../trpc";
import { publicRouter } from "./public";
import { workspaceRouter } from "./workspace";
import { servicesRouter } from "./services";
import { staffRouter } from "./staff";
import { customersRouter } from "./customers";
import { reportsRouter } from "./reports";
import { settingsRouter } from "./settings";
import { availabilityRouter } from "./availability";
import { manageRouter } from "./manage";
import { auditRouter } from "./audit";

export const appRouter = router({
  public: publicRouter,
  workspace: workspaceRouter,
  services: servicesRouter,
  staff: staffRouter,
  customers: customersRouter,
  reports: reportsRouter,
  settings: settingsRouter,
  availability: availabilityRouter,
  manage: manageRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;