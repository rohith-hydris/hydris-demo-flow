import FactoryScreen from "@/src/components/domain/FactoryScreen";

export default async function FactoryPage({ params }: PageProps<"/factories/[id]">) {
  const { id } = await params;
  return <FactoryScreen factoryId={id} />;
}
