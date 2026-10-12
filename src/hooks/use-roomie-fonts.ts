import { useFonts } from 'expo-font';
export function useRoomieFonts() {
 return useFonts({
  RoomieInter: require('../../assets/fonts/Inter-Regular.ttf'),
  RoomieInterMedium: require('../../assets/fonts/Inter-Medium.ttf'),
  RoomieInterSemiBold: require('../../assets/fonts/Inter-SemiBold.ttf'),
  RoomieInterBold: require('../../assets/fonts/Inter-Bold.ttf'),
  RoomieInterExtraBold: require('../../assets/fonts/Inter-ExtraBold.ttf'),
 });
}
