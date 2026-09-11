import type { RuntimeExecutionRequest } from '@ai-work-partner/shared';

export const RUNTIME_FENCE_PROTOCOL = 'monotonic-v1';

type FenceClaims = Pick<RuntimeExecutionRequest, 'runtimeId'|'graphId'|'nodeId'|'attemptId'|'executionOwner'|'executionVersion'|'leaseExpiresAt'> & { tenantId:string };

function encode(value:string):string {
  return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function sign(value:string,secret:string):Promise<string>{
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)));
  let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return encode(binary);
}

/**
 * The token is deliberately self-contained. A runtime target must verify the
 * signature and persist the highest accepted executionVersion per graph.
 * A lower generation is rejected before the external side effect starts.
 */
export async function createRuntimeFenceToken(claims:FenceClaims,secret:string):Promise<string>{
  if(!secret)throw new Error('Runtime fence secret is required');
  const payload=encode(JSON.stringify({protocol:RUNTIME_FENCE_PROTOCOL,...claims}));
  return `${payload}.${await sign(payload,secret)}`;
}

export function runtimeFenceClaims(request:RuntimeExecutionRequest,tenantId:string):FenceClaims{
  return {tenantId,runtimeId:request.runtimeId,graphId:request.graphId,nodeId:request.nodeId,attemptId:request.attemptId,executionOwner:request.executionOwner,executionVersion:request.executionVersion,leaseExpiresAt:request.leaseExpiresAt};
}
