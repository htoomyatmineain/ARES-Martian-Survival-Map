export default function MissionScienceGoal({targetId,approach}:{targetId:string;approach:boolean}){
 const wildcat=targetId==='wildcat-ridge-hazeltop';
 const named=targetId!=='custom';
 return <section className="rm-science-goal" aria-label="Proposed science goal">
  <span>PROPOSED CREW SCIENCE · SIMULATION</span>
  <h3>{wildcat?'Revisit Wildcat Ridge':'Document Jezero rock layers'}</h3>
  <p>{wildcat?'Document rock layers and their field context at Wildcat Ridge to support investigation of an ancient lake environment and possible preservation of evidence of past life.':'Document rock layers and geological context at the selected destination to support investigation of Jezero’s past environments.'}</p>
  {wildcat&&<p>Perseverance sampled this outcrop and detected organic material. Organic material does not establish life.</p>}
  <p>Proposed human contribution: choose observation viewpoints and record field interpretations. This is a team-designed investigation, not a NASA-assigned EVA.</p>
  <p className="rm-science-goal-limit">{approach?'This plan reaches an approach point only. Final access is unresolved; no outcrop investigation or sampling is simulated.':named?'If the planned point is reached, crew confirmations record simulated photographs, observations and notes. No real sample or scientific finding is asserted.':'Custom location: confirm the intended observation target before departure. No site-specific scientific claim is attached.'}</p>
  <a href="https://science.nasa.gov/resource/sample-collection-and-rock-analysis-at-wildcat-ridge/" target="_blank" rel="noreferrer">NASA · Wildcat Ridge science context</a>
 </section>;
}
