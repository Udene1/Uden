import type { Env } from '../types';

const API_URL='https://api.github.com';
const MAX_FILES=300;
const MAX_PATCH=100_000;

interface GitHubPullFile { filename:string; status:string; additions:number; deletions:number; changes:number; patch?:string|null; sha:string; }

function unb64(value:string):Uint8Array { const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4); return Uint8Array.from(atob(padded),c=>c.charCodeAt(0)); }
function keyBytes(secret:string):Uint8Array { const bytes=unb64(secret); if(bytes.byteLength!==32)throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY must decode to 32 bytes'); return bytes; }
async function decrypt(value:string,secret:string):Promise<string> { const combined=unb64(value); if(combined.length<13)throw new Error('Invalid encrypted GitHub token'); const key=await crypto.subtle.importKey('raw',keyBytes(secret),'AES-GCM',false,['decrypt']); return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:combined.slice(0,12)},key,combined.slice(12))); }
async function getToken(env:Env,tenantId:string):Promise<string> { if(!env.GITHUB_TOKEN_ENCRYPTION_KEY)throw new Error('GitHub integration is not configured'); const row=await env.DB.prepare('SELECT access_token_encrypted FROM github_connections WHERE tenant_id=? ORDER BY updated_at DESC LIMIT 1').bind(tenantId).first<{access_token_encrypted:string}>(); if(!row)throw new Error('GitHub is not connected'); return decrypt(row.access_token_encrypted,env.GITHUB_TOKEN_ENCRYPTION_KEY); }
function repoPath(owner:string,repo:string,number:number):string { if(!/^[A-Za-z0-9_.-]+$/.test(owner)||!/^[A-Za-z0-9_.-]+$/.test(repo))throw new Error('Invalid GitHub repository'); if(!Number.isInteger(number)||number<1)throw new Error('Invalid pull request number'); return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/files`; }

export async function getGitHubPullFiles(env:Env,tenantId:string,owner:string,repo:string,number:number):Promise<GitHubPullFile[]> {
  const token=await getToken(env,tenantId); const files:GitHubPullFile[]=[];
  for(let page=1;page<=10&&files.length<MAX_FILES;page++) {
    const response=await fetch(`${API_URL}${repoPath(owner,repo,number)}?per_page=30&page=${page}`,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Uden/1.0',Authorization:`Bearer ${token}`} });
    if(!response.ok){if(response.status===401)throw new Error('GitHub authorization expired');if(response.status===403)throw new Error('GitHub API permission or rate limit exceeded');if(response.status===404)throw new Error('GitHub pull request not found');throw new Error(`GitHub pull request files request failed (${response.status})`);}
    const batch=await response.json() as GitHubPullFile[]; if(!Array.isArray(batch))throw new Error('GitHub returned an invalid pull request files response');
    for(const file of batch)files.push({...file,patch:file.patch?file.patch.slice(0,MAX_PATCH):file.patch});
    if(batch.length<30)break;
  }
  return files.slice(0,MAX_FILES);
}
