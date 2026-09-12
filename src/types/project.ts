import { z } from "zod";
import {
  projectSchema,
  storedProjectSchema,
  projectContentSchema,
  projectDraftSchema,
} from "@/lib/schemas/project";
export type Project = z.infer<typeof projectSchema>;
export type StoredProject = z.infer<typeof storedProjectSchema>;
export type ProjectContent = z.infer<typeof projectContentSchema>;
export type ProjectDraft = z.infer<typeof projectDraftSchema>;
export type ProjectStatus = Project["status"];
export type NextStep = Project["desiredNextSteps"][number];
