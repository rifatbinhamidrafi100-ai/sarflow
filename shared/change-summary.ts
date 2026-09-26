/** Percentage of counted cells, never an area, pollutant concentration or probability. */
export function cellPercentage(count:number,total:number):number|null{
 return Number.isFinite(count)&&Number.isFinite(total)&&total>0&&count>=0&&count<=total?100*count/total:null;
}
export function observationGap(before:string,after:string):number|null{
 const days=(Date.parse(after)-Date.parse(before))/86400000;
 return Number.isFinite(days)&&days>=0?days:null;
}
