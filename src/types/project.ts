import { z } from "zod";
import {
  projectSchema,
  storedProjectSchema,
  projectSubmissionSchema,
  projectDraftSchema,
} from "@/lib/schemas/project";
export type Project = z.infer<typeof projectSchema>;
export type StoredProject = z.infer<typeof storedProjectSchema>;
export type ProjectSubmission = z.infer<typeof projectSubmissionSchema>;
export type ProjectDraft = z.infer<typeof projectDraftSchema>;
export type ModerationStatus = Project["moderationStatus"];
export type ProjectStatus = Project["status"];
