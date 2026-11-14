import {readFile,writeFile} from 'node:fs/promises';
import {decodeHazards} from '../src/loadNativeHazards.ts';
import {DEMO_RULES,planNativeRoute} from '../src/nativeRouting.ts';
import {planScienceRoute} from '../src/scienceRouting.ts';
import {MAP_SCIENCE_SITES,sciencePoint} from '../src/scienceSites.ts';
const b=await readFile('public/data/routing/native-hazards.bin');const grid=await decodeHazards(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
const rows=[];for(const site of MAP_SCIENCE_SITES){const end=sciencePoint(site),start={x:1900,z:1500};const before=planNativeRoute(grid,start,end,DEMO_RULES);const after=planScienceRoute(grid,start,end,DEMO_RULES,false,true);const row={id:site.id,name:site.name,beforeExact:!!before,after:after.route?.approach?'approach':after.route?'exact':'no-route',searchSpacingMetres:after.route?.searchSpacingMetres??null,gapMetres:after.route?.approach?.gapMetres??0,reason:after.diagnosis?.message??null};rows.push(row);console.log(JSON.stringify(row));}
await writeFile('../docs/routing-search-audit-2026-11-14.json',JSON.stringify({description:'Graph-level assessment only; no new native-height profile fetch or hardware validation. Default project rules, exclusion off, default habitat.',rules:DEMO_RULES,sites:rows},null,2));
