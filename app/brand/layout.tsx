import { getBrand } from "@/src/lib/data";
import { AppMain, TopBar } from "@/src/components/ui";

export default async function BrandLayout({ children }: LayoutProps<"/brand">) {
  const brand = await getBrand();
  return (
    <>
      <TopBar role="Brand" brandName={brand.name} home="/brand" />
      <AppMain>{children}</AppMain>
    </>
  );
}
