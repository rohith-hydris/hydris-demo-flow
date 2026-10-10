import { getBrand } from "@/src/lib/data";
import { AppMain, TopBar } from "@/src/components/ui";

export default async function SupplierLayout({ children }: LayoutProps<"/supplier">) {
  const brand = await getBrand();
  return (
    <>
      <TopBar role="Supplier" brandName={brand.name} home="/supplier" />
      <AppMain>{children}</AppMain>
    </>
  );
}
