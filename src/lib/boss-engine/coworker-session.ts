import { classifyRisk } from "./approve-gate";
import { selectSpecialistLane } from "./specialist-lanes";
import { matchPackagedJob } from "./packaged-jobs";
import { parseTeachRoutine, getRoutine } from "./routine-store";
import { enqueueCloudJob } from "./cloud-runtime";

export type CoworkerPlan = {
  lane: string;
  skills: string[];
  packagedJob: string | null;
  routine: string | null;
  cloudJobId: string | null;
  approvalRequired: boolean;
  steps: string[];
};

export function planCoworkerTurn(text: string): CoworkerPlan {
  const specialist = selectSpecialistLane(text);
  const packaged = matchPackagedJob(text);
  const taught = parseTeachRoutine(text);
  const routine = taught ?? getRoutine(text.match(/routine\s+(?:ชื่อ\s+)?([^\s:]+)/i)?.[1] ?? "");
  const action = /merge|deploy|send|ส่ง|ดีพลอย/i.test(text) ? (text.match(/merge|deploy|send|ส่ง|ดีพลอย/i)?.[0] ?? "send") : "read";
  const approval = classifyRisk(action);
  const background = /ทำต่อ|background|เบื้องหลัง|ต่อให้เอง/i.test(text);
  const cloudJob = background ? enqueueCloudJob(text) : null;
  const steps = [
    `🤝 Specialist: ${specialist.lane}`,
    ...(specialist.skills.length ? [`🧩 Skills: ${specialist.skills.join(", ")}`] : []),
    ...(packaged ? [`📦 Job: ${packaged.kind}`] : []),
    ...(routine ? [`🔁 Routine: ${routine.name}`] : []),
    ...(cloudJob ? [`☁️ Background job queued: ${cloudJob.id}`] : []),
    ...(approval.required ? [`🛡️ Approval required: ${approval.action}`] : []),
  ];
  return { lane: specialist.lane, skills: specialist.skills, packagedJob: packaged?.kind ?? null, routine: routine?.name ?? null, cloudJobId: cloudJob?.id ?? null, approvalRequired: approval.required, steps };
}
