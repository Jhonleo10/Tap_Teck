import { getSettings } from "@/actions/settings";
import { SettingsContent } from "@/components/settings/settings-content";

export default async function SettingsPage() {
  const { settings, categories } = await getSettings();
  return <SettingsContent settings={settings} categories={categories} />;
}
