import { getAppearance } from "@/lib/platform-settings";
import { AppearanceManager } from "@/components/admin/AppearanceManager";

export const metadata = { title: "Apparence du site" };

export default async function AppearancePage() {
  return <AppearanceManager initial={await getAppearance()} />;
}
