import{it,expect}from'vitest';import{spawnSync}from'node:child_process';import{resolve}from'node:path';
it('parses byte-length framed UTF-8 requests without hanging',()=>{
 const payload=JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'inteiro_find_pattern',arguments:{query:'formulário'}}});const input='Content-Length: '+Buffer.byteLength(payload)+'\r\n\r\n'+payload;
 const response=spawnSync(process.execPath,[resolve('packages/mcp/src/server.ts')],{encoding:'utf8',input,timeout:10000});expect(response.status,response.stderr).toBe(0);const end=response.stdout.indexOf('\r\n\r\n');expect(end).toBeGreaterThan(0);const result=JSON.parse(response.stdout.slice(end+4));const content=JSON.parse(result.result.content[0].text);expect(content.status).toBe('passed');
});
it('does not reply to JSON-RPC notifications',()=>{
 const response=spawnSync(process.execPath,[resolve('packages/mcp/src/server.ts')],{encoding:'utf8',input:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n'});expect(response.status).toBe(0);expect(response.stdout).toBe('');
});
