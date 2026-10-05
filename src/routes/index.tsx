import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Replace, Truck } from "lucide-react";
import logo from "@/assets/integra-mission-critical-logo.webp.asset.json";
import { Button } from "@/components/ui/button";
import {
  CtaBand,
  Eyebrow,
  FeatureCard,
  SectionHeading,
  StatTile,
  StepCard,
} from "@/components/design";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Integra Procurement & Material Transfer Platform" },
      {
        name: "description",
        content:
          "One platform for purchase requests, equipment substitutions and material transfers across every Integra mission critical project.",
      },
      { property: "og:title", content: "Integra Procurement & Material Transfer Platform" },
      {
        property: "og:description",
        content:
          "Purchase requests, equipment substitutions and material transfers with tracked approvals.",
      },
    ],
  }),
  component: Landing,
});

const FORMS = [
  {
    icon: ClipboardList,
    id: "PR-XXXXXX",
    name: "Purchase Request",
    copy: "Vendor, shipping, module and line items with automatic pricing and buyer handoff.",
  },
  {
    icon: Replace,
    id: "ES-XXXXXX",
    name: "Equipment Substitution",
    copy: "Component transfer from and on equipment tags, certified and reviewed with signatures.",
  },
  {
    icon: Truck,
    id: "MTF-XXXXXX",
    name: "Material Transfer",
    copy: "Transfer type, part-level line items and dual signatures for release and receipt.",
  },
];

const STEPS = [
  {
    title: "Field raises it",
    copy: "Senior superintendent opens the form, attaches quotes or photos and signs on site.",
  },
  {
    title: "Office endorses",
    copy: "Project executive and project manager review, comment and record a decision.",
  },
  {
    title: "TRADES AND TECHNICIANS CLOSE IT",
    copy: "Trade partners and the installation team accept receipt with a dual signature.",
  },
];

const STATS = [
  { figure: "3", caption: "Paper forms replaced by one tracked workflow" },
  { figure: "5", caption: "Approval stages, every decision, time-stamped." },
  { figure: "100%", caption: "Forms tied to a project number and CX-Alloy Number." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex min-h-24 items-center justify-between gap-6 border-b border-border px-6 py-4">
        <img
          src={logo.url}
          alt="Integra Mission Critical"
          className="h-7 w-auto sm:h-9"
        />
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <div className="signal-bar h-0.5 w-full" />

      <main>
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <Eyebrow>Procurement operations</Eyebrow>
          <h1 className="mt-5 text-balance text-5xl leading-[1.02] text-foreground md:text-6xl">
            ONE CONTROLLED CHAIN OF PROCUREMENT ITEMS.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground">
            Purchase requests, equipment substitutions and material transfers, routed from the field
            superintendent through executive, project management, trade partners and installation,
            with a full audit trail on every project.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Open the platform</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#forms">See the three forms</a>
            </Button>
          </div>
        </section>

        <section id="forms" className="mx-auto max-w-5xl px-6 pb-20">
          <SectionHeading
            eyebrow="The forms"
            title="Every request starts on one of three records"
            description="Each carries its own nine-character ID, signatures and attachments."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FORMS.map((form) => (
              <FeatureCard
                key={form.id}
                icon={form.icon}
                tag={form.id}
                title={form.name}
                description={form.copy}
              />
            ))}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <SectionHeading
              eyebrow="Approval chain"
              title="From the field to final acceptance"
              description="Each stage records the decision, the comments and the time it was made."
            />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <StepCard
                  key={step.title}
                  step={index + 1}
                  title={step.title}
                  description={step.copy}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {STATS.map((stat) => (
              <StatTile key={stat.caption} figure={stat.figure} caption={stat.caption} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <CtaBand
            eyebrow="Get started"
            title="Run your next request through the platform"
            description="Sign in with your Integra account to raise a request, sign it on site and track it through to receipt."
            footnote="Internal platform — access is limited to Integra team members."
          >
            <Button asChild size="lg">
              <Link to="/auth">Open the platform</Link>
            </Button>
          </CtaBand>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-6 text-xs text-muted-foreground">
        Integra Mission Critical — internal procurement platform.
      </footer>
    </div>
  );
}
