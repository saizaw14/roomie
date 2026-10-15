import { useLocalSearchParams } from 'expo-router';
import { HouseholdSheetScreen } from './household-sheet-screen';
export function JoinHouseholdScreen(){
 const {code}=useLocalSearchParams<{code?:string|string[]}>();
 return <HouseholdSheetScreen initialView="join" initialCode={typeof code==='string'?code:''}/>;
}
