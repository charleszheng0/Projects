import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
            Poker GTO Trainer
          </h1>
          <p className="max-w-md text-lg leading-8 text-gray-400">
            Practice Game Theory Optimal preflop decisions. Get instant feedback on your poker strategy.
          </p>
          <div className="flex gap-4 mt-4">
            <Link href="/game">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg">
                Start Training
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
