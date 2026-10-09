import { createFileRoute } from "@tanstack/react-router";
import { JarvisApp } from "@/components/app/JarvisApp";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <JarvisApp />;
}
