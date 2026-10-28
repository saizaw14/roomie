/** Sentence-case the first visible character without rewriting saved titles or acronyms. */
export function displayExpenseTitle(title: string): string {
 return title.replace(/\S/u, character => character.toLocaleUpperCase());
}
