import ScenarioDetailScreen from "@/src/components/domain/ScenarioDetailScreen";

export default async function ScenarioPage({ params }: PageProps<"/projects/scenarios/[id]">) {
  const { id } = await params;
  return <ScenarioDetailScreen scenarioId={id} />;
}
