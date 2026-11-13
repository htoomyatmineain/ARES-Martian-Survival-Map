import { type HazardGrid, type RoutingRules } from './nativeRouting';
import {planScienceRoute} from './scienceRouting';
import type { Point } from './terrain';
let grid:HazardGrid|null=null;
self.onmessage=(event:MessageEvent<{grid?:HazardGrid;id:number;start:Point;end:Point;rules:RoutingRules;blocked:boolean;allowApproach?:boolean}>)=>{const m=event.data;if(m.grid)grid=m.grid;try{if(!grid)throw Error('Native slope data is not ready');self.postMessage({id:m.id,...planScienceRoute(grid,m.start,m.end,m.rules,m.blocked,m.allowApproach)});}catch(e){self.postMessage({id:m.id,error:e instanceof Error?e.message:'Route calculation failed'});}};
