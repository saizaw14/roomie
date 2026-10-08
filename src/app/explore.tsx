import { Redirect } from 'expo-router';
// Preserve old starter links while retiring the Explore screen.
export default function Explore() { return <Redirect href="/" />; }
