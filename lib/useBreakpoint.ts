import { useWindowDimensions } from "react-native";

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return { isDesktop: width >= 768 };
}
