import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const events={}; const keys=new Set(['d']); const pointer={down:true};
const context=vm.createContext({keys,pointer,window:{addEventListener:(name,fn)=>events[name]=fn},document:{hidden:true,addEventListener:(name,fn)=>events[name]=fn},canvas:{addEventListener:(name,fn)=>events[name]=fn}});
vm.runInContext(source.slice(source.indexOf('function releaseInput()'),source.indexOf('canvas.addEventListener("pointermove"')),context);
for(const event of ['blur','visibilitychange','pointerup','pointercancel']) {
 keys.add('d');pointer.down=true;events[event]();assert.equal(pointer.down,false);
 if(event==='blur'||event==='visibilitychange') assert.equal(keys.size,0);
}
console.log('Focus loss and pointer cancellation release held input.');
