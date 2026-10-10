import { notFound } from "next/navigation";
import { getEtpDetail, getFactory, listAlerts, listFactoryIds, getFactoryPwi, getFactoryRiskReport, getCurrentSupplierId } from "@/src/lib/data";
import FactoryDetail from "../../../_components/FactoryDetail";

export default async function Page(props: PageProps<"/supplier/factories/[factoryId]">) {
  const { factoryId } = await props.params;
  const factory = await getFactory(factoryId);
  if (!factory) notFound();
  if (factory.supplierId !== (await getCurrentSupplierId())) notFound();
  const [report, pwi, etp, alerts] = await Promise.all([getFactoryRiskReport(factoryId), getFactoryPwi(factoryId), getEtpDetail(factoryId), listAlerts({ factoryId })]);
  return <FactoryDetail role="supplier" factory={factory} report={report} pwi={pwi} etp={etp} alerts={alerts} />;
}

export async function generateStaticParams() {
  return (await listFactoryIds()).map((factoryId) => ({ factoryId }));
}

