/** Category symbols are shared by cards, filters and selectors. */
export function categoryIconName(category:string) {
 switch(category){
  case 'Groceries': return 'groceries';
  case 'Utilities': return 'bolt';
  case 'Rent': return 'building';
  case 'Transport': return 'transport';
  default: return 'other';
 }
}
