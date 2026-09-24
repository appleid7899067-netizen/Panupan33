import { activateVerifiedSkill, normalizeSkill, type SkillRecord } from "../../../skill-registry";

export type DataParseFormat = "pdf" | "csv" | "json" | "text" | "html" | "markdown" | "table";

export type DataParsingRequest = {
  input: string;
  inputFormat: DataParseFormat;
  outputFormat?: DataParseFormat;
  extract?: string[];
};

export const DATA_PARSING_FORMATTING_SKILL: SkillRecord = activateVerifiedSkill(
  normalizeSkill({
    id: "core.data-parsing-formatting",
    name: "Data Parsing & Formatting",
    description: "Parse, normalize, extract, transform and format common document and structured-data inputs.",
    origin: "core",
    capabilities: ["data", "files", "verify"],
    version: "1.0.0",
  }),
  true,
);

export function describeDataParsing(request: DataParsingRequest) {
  return {
    skill: DATA_PARSING_FORMATTING_SKILL.id,
    inputFormat: request.inputFormat,
    outputFormat: request.outputFormat ?? "json",
    extractionTargets: request.extract ?? [],
    requiresVerification: true,
  };
}
