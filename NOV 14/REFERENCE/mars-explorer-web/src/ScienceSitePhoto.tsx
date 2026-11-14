import {useState} from 'react';
import catalogue from '../../docs/resource-preparation/teammate/photos/photo-catalog.json';
import skyland from '../../docs/resource-preparation/teammate/photos/thumbnails/mars-sample-11-nlf-0495-0710900102-755ecm-n0261004ncam00709-01-095j.webp';
import hazeltop from '../../docs/resource-preparation/teammate/photos/thumbnails/mars-sample-12-nlf-0509-0712140650-691ecm-n0261222ncam00709-01-095j.webp';

const images:Record<string,string>={'skinner-ridge-skyland':skyland,'wildcat-ridge-hazeltop':hazeltop};
export default function ScienceSitePhoto({siteId}:{siteId:string}){
 const [failed,setFailed]=useState(false);
 const photo=catalogue.photos.find(p=>p.siteId===siteId);
 if(!photo||!images[siteId])return null;
 return <figure className="rm-site-photo" aria-label="NASA outcrop photograph">
  <span className="rm-photo-label">ROVER VIEW · HISTORICAL</span>
  {failed?<p role="status">Photo could not load. Open the NASA original below.</p>:<a href={photo.originalImageUrl} target="_blank" rel="noreferrer" aria-label={`Open NASA original: ${photo.title}`}><img src={images[siteId]} width={photo.thumbnailDimensions[0]} height={photo.thumbnailDimensions[1]} alt={photo.title} loading="lazy" decoding="async" onError={()=>setFailed(true)}/></a>}
  <figcaption><strong>{photo.title}</strong><span>{photo.credit}</span><span>Sol {photo.sol} · {photo.acquisitionDateAsPublished}</span><span>{photo.camera} · {photo.localMeanSolarTime} LMST</span></figcaption>
  <p className="rm-photo-association">NASA-captioned sample outcrop. Historical context, not current conditions or a mapped camera footprint.</p>
  <details><summary>Photo source &amp; identification</summary><p>{photo.caption}</p><p>{photo.associationReason}</p><p>Calendar date and local Mars time are retained as published; a UTC acquisition instant is not verified.</p><ul>{photo.limitations.map(note=><li key={note}>{note}</li>)}</ul><a href={photo.sourcePageUrl} target="_blank" rel="noreferrer">NASA sample catalogue ↗</a><a href={photo.originalImageUrl} target="_blank" rel="noreferrer">Original NASA image ↗</a><small>Web asset ID: {photo.imageId}</small></details>
 </figure>;
}
