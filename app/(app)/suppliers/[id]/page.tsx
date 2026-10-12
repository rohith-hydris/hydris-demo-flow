import SupplierDetailScreen from "@/src/components/domain/SupplierDetailScreen";

export default async function SupplierPage({ params }: PageProps<"/suppliers/[id]">) {
  const { id } = await params;
  return <SupplierDetailScreen supplierId={id} />;
}
