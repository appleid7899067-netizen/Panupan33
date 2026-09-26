import { createFileRoute } from "@tanstack/react-router";
function tokenFrom(request: Request){const v=request.headers.get("authorization")||"";return v.startsWith("Bearer ")?v.slice(7).trim():"";}
export const Route=createFileRoute("/api/grok-model/v1/models")({server:{handlers:{GET:async({request})=>tokenFrom(request)?Response.json({object:"list",data:[{id:"puter",object:"model",owned_by:"puter"}]}):Response.json({data:[]},{status:401})}}});
