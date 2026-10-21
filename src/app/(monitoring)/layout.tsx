import { MonitoringShell } from "@/components/pages/monitoring-shell/MonitoringShell";

export default function MonitoringLayout({ children }: LayoutProps<"/">) {
  return <MonitoringShell>{children}</MonitoringShell>;
}
