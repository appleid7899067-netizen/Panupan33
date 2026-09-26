import { createFileRoute } from "@tanstack/react-router";
import { runModelGateway, type GatewayToolDef } from "@/lib/model-gateway.server";
function tokenFrom(request: Request) { const v=request.headers.get("authorization")||""; return v.startsWith("Bearer ")?v.slice(7).trim():""; }
async function complete(request: Request) {
  const token=tokenFrom(request); if(!token) return Response.json({error:{message:"Puter authentication required"}},{status:401});
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const messages=Array.isArray(body.messages)?body.messages as Record<string,unknown>[]:[];
  const tools=Array.isArray(body.tools)?body.tools as GatewayToolDef[]:[];
  const requested=typeof body.model==="string" && body.model!=="puter" ? body.model : undefined;
  const result=await runModelGateway({messages,tools,requestedModel:requested,puterToken:token,maxAttempts:4});
  if(!result.ok) return Response.json({error:{message:result.error}},{status:503});
  const calls=result.result.toolCalls;
  const message:Record<string,unknown>={role:"assistant",content:result.result.text||null};
  if(calls.length) message.tool_calls=calls.map((call,index)=>({id:call.id||`puter_call_${index}`,type:"function",function:{name:call.name,arguments:JSON.stringify(call.arguments)}}));
  return Response.json({id:`puter-${Date.now()}`,object:"chat.completion",created:Math.floor(Date.now()/1000),model:result.result.model,choices:[{index:0,message,finish_reason:calls.length?"tool_calls":"stop"}]});
}
export const Route=createFileRoute("/api/grok-model/v1/chat/completions")({server:{handlers:{POST:async({request})=>complete(request)}}});
