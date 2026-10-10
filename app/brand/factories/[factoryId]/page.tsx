import { notFound } from "next/navigation";
import { getEtpDetail, getFactory, listAlerts, listFactoryIds, getFactoryPwi, getFactoryRiskReport } from "@/src/lib/data";
import FactoryDetail from "../../../_components/FactoryDetail";

export default async function Page(props: PageProps<"/brand/factories/[factoryId]">) {
  const { factoryId } = await props.params;
  const factory = await getFactory(factoryId);
  if (!factory) notFound();

  const [report, pwi, etp, alerts] = await Promise.all([getFactoryRiskReport(factoryId), getFactoryPwi(factoryId), getEtpDetail(factoryId), listAlerts({ factoryId })]);
  return <FactoryDetail role="brand" factory={factory} report={report} pwi={pwi} etp={etp} alerts={alerts} />;
}

export async function generateStaticParams() {
  return (await listFactoryIds()).map((factoryId) => ({ factoryId }));
}

