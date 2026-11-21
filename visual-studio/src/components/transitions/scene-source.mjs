export function transitionImagePath(value,theme){
 if(!value.startsWith('sample:'))return value;
 return `transition-scenes/${theme}-${value==='sample:before'?'before':'after'}.svg`;
}
