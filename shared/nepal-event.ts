export const nepalEvent={
 id:'nepal-rasuwa-2026',title:'Nepal: the Rasuwa flood',date:'2026-08-26',reviewed:'2026-09-24',regionId:'nepal-rasuwa',
 status:'Documented event · unvalidated SAR interpretation',
 sources:[
  {id:'nset',name:'NSET — Rasuwa Debris Flash Flood 2026',url:'https://nset.org.np/disaster/rasuwa-flood/',role:'Event date, reported hazard sequence, and affected river corridor.'},
  {id:'unicef',name:'UNICEF Nepal — 2026 flood situation reports',url:'https://www.unicef.org/nepal/reports/nepal-floods-2026-humanitarian-situation-reports',role:'Dated humanitarian response updates; not satellite measurements.'},
  {id:'unfpa',name:'UNFPA — 28 August–3 September 2026 report',url:'https://www.unfpa.org/resources/situation-report-nepal-flood-28-august-%E2%80%93-3-september-2026',role:'Reported displacement and disruption to infrastructure and health services.'},
 ],
 timeline:[
  {date:'2026-08-26',title:'Reported flood event',source:'nset',text:'NSET describes an ice–rock avalanche upstream of Rasuwagadhi followed by a debris-laden flood along the Bhote Koshi–Trishuli–Narayani corridor. The initiating-process account is attributed to NSET, not inferred by SARFlow.'},
  {date:'2026-08-31',title:'First UNICEF situation report',source:'unicef',text:'UNICEF publishes its first listed situation report for the response. This reporting date is separate from the event date and satellite acquisition dates.'},
  {date:'2026-09-03',title:'Humanitarian reporting period ends',source:'unfpa',text:'UNFPA’s 28 August–3 September update describes displacement and damage affecting transport and access to health services.'},
  {date:'2026-09-16',title:'Fourth UNICEF situation report',source:'unicef',text:'A later response update is available from UNICEF. Consult the dated reports for their assessment scope and evolving information.'},
 ],
 limitations:[
  'No validated flood extent, water depth, affected-area estimate, casualty estimate, or damage classification is computed by SARFlow.',
  'Archived GIBS images are false-color daily mosaics, not calibrated power rasters. Their colors must not be used to calculate dB change.',
  'The selected view covers part of the study corridor, not the complete affected region. Catalog matches are not a pixel-level provenance inventory.',
  'Mountain radar shadow, layover, vegetation, sediment, moisture, and viewing geometry complicate interpretation. A dark pixel is not proof of flooding.',
  'Observations before and after the event do not capture its peak automatically. Independent evidence and reviewed quality masks are required.',
 ],
};
