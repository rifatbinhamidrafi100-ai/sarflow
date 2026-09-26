/** English-source names first; normalize Latin spelling, never invent translations. */
export function englishPlace(value:unknown):string|null{
 if(typeof value!=='string'||!value.trim())return null;
 const name=value.normalize('NFD').replace(/\p{M}/gu,'').replace(/[’‘]/g,"'").replace(/[–—]/g,'-').replace(/ß/g,'ss').replace(/Æ/g,'Ae').replace(/æ/g,'ae').replace(/Ø/g,'O').replace(/ø/g,'o').replace(/Ł/g,'L').replace(/ł/g,'l').trim();
 return /^[\x20-\x7E]+$/.test(name)?name:null;
}
