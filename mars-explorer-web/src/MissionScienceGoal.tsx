import {missionProcedure} from './missionProcedure';
export default function MissionScienceGoal({targetId,approach}:{targetId:string;approach:boolean}){
 const procedure=missionProcedure(targetId);
 return <section className="rm-science-goal" aria-label="Proposed science goal">
  <span>NASA SCIENCE CONTEXT · PROPOSED CREW FOLLOW-UP</span>
  <h3>{procedure.title}</h3>
  <p><strong>NASA context:</strong> {procedure.historicalContext}</p>
  <p><strong>Proposed EVA objective:</strong> {procedure.objective}</p>
  <p className="rm-fineprint">Team-designed documentation activity, not a NASA-assigned astronaut mission. Paired cores can share one outcrop; their proposed activities are complementary.</p>
  <p className="rm-science-goal-limit">{approach?'Approach point only. Target access is unresolved; no science task at the unreached outcrop is simulated.':'Crew confirmations record simulated documentation only. No collection, mineral identification or finding of life is asserted.'}</p>
  {procedure.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}
 </section>;
}
