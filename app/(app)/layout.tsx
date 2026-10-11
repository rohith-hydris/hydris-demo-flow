import AppGate from "@/src/components/shell/AppGate";
import Footer from "@/src/components/shell/Footer";
import TopNav from "@/src/components/shell/TopNav";
import { ProjectsProvider } from "@/src/context/ProjectsContext";
import { TraceProvider } from "@/src/components/domain/Trace";

// Shell for every inner page: floating nav, role gate, "Where this number comes from" drawer, ghosted footer.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <TraceProvider>
      <ProjectsProvider>
        <TopNav />
        <div className="flex flex-1 flex-col"><AppGate>{children}</AppGate></div>
        <Footer />
      </ProjectsProvider>
    </TraceProvider>
  );
}
