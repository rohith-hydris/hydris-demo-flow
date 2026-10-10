import Link from "next/link";

const roles = [
  { href: "/brand", title: "I am a brand", text: "See water risk and impact across all your suppliers and factories." },
  { href: "/supplier", title: "I am a supplier", text: "See the water risk and impact of your own factories." },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:py-20">
      <p className="font-bold text-brand">Hydris</p>
      <h1 className="mt-1 text-3xl font-extrabold text-navy sm:text-4xl">Stewardship Command Centre</h1>
      <p className="mt-3 max-w-xl text-lg">Choose how you want to look at water risk and positive water impact.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {roles.map((r) => (
          <Link key={r.href} href={r.href} className="card block min-h-44 p-6 transition-colors hover:border-brand hover:bg-white focus-visible:border-brand">
            <span className="text-2xl font-extrabold text-navy">{r.title}</span>
            <span className="mt-2 block text-lg">{r.text}</span>
            <span className="mt-4 inline-block font-bold text-brand">Open dashboard →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
