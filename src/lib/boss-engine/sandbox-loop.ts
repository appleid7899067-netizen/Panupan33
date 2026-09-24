import {executeSandbox,type SandboxExecutor} from "./sandbox-tool";
import type {SandboxRequest,SandboxResult} from "./sandbox-runtime";
export type SandboxLoopDecision={status:"success"|"retry"|"failed";attempt:number;result:SandboxResult;reason:string};
export async function runSandboxLoop(executor:SandboxExecutor,request:SandboxRequest,maxAttempts=3):Promise<SandboxLoopDecision>{
 let current=request;
 for(let attempt=1;attempt<=Math.max(1,Math.min(maxAttempts,5));attempt++){
  const result=await executeSandbox(executor,current);
  if(result.ok)return{status:"success",attempt,result,reason:"Execution produced verified sandbox evidence."};
  if(result.timedOut)return{status:attempt<maxAttempts?"retry":"failed",attempt,result,reason:"Execution timed out; retry requires a revised bounded program."};
  if(attempt<maxAttempts)return{status:"retry",attempt,result,reason:"Execution failed; agent may inspect stderr and revise the code."};
  return{status:"failed",attempt,result,reason:"Maximum sandbox repair attempts reached."};
 }
 throw new Error("Sandbox loop did not execute");
}
