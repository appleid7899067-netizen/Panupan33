import {normalizeSandboxRequest,type SandboxRequest,type SandboxResult,createSandboxEvidence} from "./sandbox-runtime";
export type SandboxExecutor=(request:SandboxRequest)=>Promise<Omit<SandboxResult,"evidenceId">>;
export async function executeSandbox(executor:SandboxExecutor,request:SandboxRequest):Promise<SandboxResult>{
 const normalized=normalizeSandboxRequest(request);
 const result=await executor(normalized);
 return createSandboxEvidence(result);
}
export function sandboxFailureForAgent(result:SandboxResult){
 if(result.ok)return null;
 return {type:"sandbox_error",message:result.stderr||"Sandbox execution failed",exitCode:result.exitCode,timedOut:result.timedOut,evidenceId:result.evidenceId};
}
