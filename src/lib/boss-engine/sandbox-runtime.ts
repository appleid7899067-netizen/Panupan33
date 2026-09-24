export type SandboxLanguage="python"|"javascript"|"typescript"|"bash"|"node"|"go"|"rust"|"java"|"cpp"|"c"|"php";
export type SandboxLimits={timeoutMs?:number;memoryMb?:number;maxOutputBytes?:number;network?:boolean};
export type SandboxRequest={language:SandboxLanguage;code:string;stdin?:string;limits?:SandboxLimits};
export type SandboxResult={ok:boolean;stdout:string;stderr:string;exitCode:number|null;timedOut:boolean;durationMs:number;evidenceId:string;runtime:string};
const DEFAULTS={timeoutMs:15000,memoryMb:256,maxOutputBytes:32768,network:false};
const COMMANDS:Record<SandboxLanguage,string>={python:"python3",javascript:"node",typescript:"tsx",bash:"bash",node:"node",go:"go run",rust:"rustc",java:"java",cpp:"g++",c:"gcc",php:"php"};
export function normalizeSandboxRequest(request:SandboxRequest){const limits={...DEFAULTS,...request.limits};return{...request,limits:{...limits,timeoutMs:Math.max(100,Math.min(limits.timeoutMs,60000)),memoryMb:Math.max(32,Math.min(limits.memoryMb,1024)),maxOutputBytes:Math.max(1024,Math.min(limits.maxOutputBytes,262144)),network:false},runtime:COMMANDS[request.language]};}
export function createSandboxEvidence(result:Omit<SandboxResult,"evidenceId">):SandboxResult{return{...result,evidenceId:"sandbox_"+Date.now()+"_"+Math.random().toString(36).slice(2,8)}}
